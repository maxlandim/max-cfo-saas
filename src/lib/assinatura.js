// Regras de acesso pago, calculadas sempre no servidor.
// O documento subscriptions/{uid} só é escrito pelo servidor (webhook do Asaas e rotas de pagamento);
// as regras do Firestore impedem o próprio usuário de alterá-lo.
//
// Pagamentos pelo Asaas, com assinatura que gera uma cobrança por mês (ou por ano):
// - cartão: o cartão é cadastrado no checkout do Asaas e cobrado sozinho em cada vencimento;
// - Pix ou boleto: o Asaas gera a cobrança e manda por e-mail; o cliente paga pelo link.
// Campos em subscriptions/{uid}:
//   asaasCustomerId, asaasSubscriptionId, statusAsaas (ACTIVE | INACTIVE | DELETED), plano, periodo, forma (cartao | pix_boleto)
//   pagoAte        fim do período coberto pelas cobranças já pagas
//   proximoVencimento, faturaPendente { id, url, vencimento, valor, situacao }
//   fundador, fundadorAte, checkoutPendente { planId, periodo, fundador, em }
import { adminAuth, adminDb, emailsAdmin, emailsCortesia } from './firebaseAdmin';
import { DIAS_DE_TESTE, PLANOS, somarMeses, CARENCIA_DIAS, MESES_PAGOS_NO_ANUAL, EMPRESA_EXTRA, MAX_EMPRESAS, empresasIncluidas } from './plans';
import { asaas, lerRef, montarRef, msDaData } from './asaas';

export async function fimDoTeste(uid) {
  const user = await adminAuth.getUser(uid);
  return new Date(user.metadata.creationTime).getTime() + DIAS_DE_TESTE * 864e5;
}

export async function statusDoUsuario(decoded) {
  const uid = decoded.uid;
  const email = (decoded.email || '').toLowerCase();

  if (email && emailsAdmin().includes(email)) {
    return { acesso: true, motivo: 'admin', plano: 'unlimited' };
  }
  if (email && emailsCortesia().includes(email)) {
    return { acesso: true, motivo: 'cortesia', plano: 'unlimited', status: 'active' };
  }

  const snap = await adminDb.collection('subscriptions').doc(uid).get();
  const sub = snap.exists ? snap.data() : {};
  const agora = Date.now();
  const fimTeste = await fimDoTeste(uid);
  const pagoAte = sub.pagoAte ? Date.parse(sub.pagoAte) : 0;
  const ativa = Boolean(sub.asaasSubscriptionId) && sub.statusAsaas === 'ACTIVE';
  const fatura = sub.faturaPendente && sub.faturaPendente.url ? sub.faturaPendente : null;
  const vencFatura = fatura ? msDaData(fatura.vencimento) : 0;
  const base = {
    forma: sub.forma || null, plano: sub.plano || null, periodo: sub.periodo || 'mensal', empresasExtras: Math.max(0, Number(sub.empresasExtras) || 0),
    renovaEm: ativa ? (sub.proximoVencimento || null) : null, pagoAte: sub.pagoAte || null, cancelada: !ativa && Boolean(sub.asaasSubscriptionId),
    ...(fatura ? { faturaPendente: { url: fatura.url, vencimento: fatura.vencimento, valor: fatura.valor, diasParaVencer: Math.ceil((vencFatura - agora) / 864e5) } } : {}),
  };

  // Período já pago (ou teste grátis com assinatura feita): tudo certo
  if (pagoAte > agora || (ativa && agora < fimTeste)) {
    return { acesso: true, motivo: 'assinatura', ...base, status: agora < fimTeste ? 'trialing' : 'active', diasParaVencer: pagoAte > agora ? Math.ceil((pagoAte - agora) / 864e5) : null };
  }
  // Cobrança da assinatura vencida há poucos dias: continua usando enquanto paga (carência)
  if (ativa && fatura && vencFatura + CARENCIA_DIAS * 864e5 > agora) {
    return { acesso: true, motivo: 'assinatura', ...base, status: vencFatura < agora ? 'past_due' : 'active' };
  }

  // Teste grátis contado a partir da criação da conta
  if (agora < fimTeste) {
    return {
      acesso: true,
      motivo: 'teste',
      testeTerminaEm: new Date(fimTeste).toISOString(),
      diasRestantes: Math.ceil((fimTeste - agora) / 864e5),
      ...base,
    };
  }

  return {
    acesso: false,
    motivo: ativa && fatura ? 'pagamento_pendente' : pagoAte ? 'periodo_vencido' : 'sem_assinatura',
    ...base,
  };
}

// Valor de cada cobrança (centavos) de um plano, com as empresas adicionais
export function valorDoPlano(planId, periodo, fundador, extras = 0) {
  const p = PLANOS[planId] || PLANOS.basic;
  const mensal = (fundador ? p.fundador : p.valor) + Math.max(0, Math.floor(Number(extras) || 0)) * EMPRESA_EXTRA;
  return mensal * (periodo === 'anual' ? MESES_PAGOS_NO_ANUAL : 1);
}
// Empresas adicionais necessárias para a quantidade de empresas cadastradas (perfis/{uid}.empresas + a principal)
export async function empresasCadastradas(uid) {
  try { const p = (await adminDb.collection('perfis').doc(uid).get()).data() || {}; return 1 + (Array.isArray(p.empresas) ? p.empresas.length : 0); } catch { return 1; }
}
export function extrasNecessarias(planId, total) { return Math.max(0, total - empresasIncluidas(planId)); }
// Ajusta a assinatura do Asaas para cobrar as empresas adicionais (a partir das próximas cobranças)
export async function ajustarEmpresasExtras(uid, extras) {
  const ref = adminDb.collection('subscriptions').doc(uid);
  const sub = (await ref.get()).data() || {};
  extras = Math.max(0, Math.min(MAX_EMPRESAS, Math.floor(Number(extras) || 0)));
  const ativa = sub.asaasSubscriptionId && sub.statusAsaas === 'ACTIVE';
  const fundador = Boolean(sub.fundador && sub.fundadorAte && Date.parse(sub.fundadorAte) > Date.now());
  const valor = valorDoPlano(sub.plano || 'basic', sub.periodo || 'mensal', fundador, extras);
  if (ativa && (sub.empresasExtras || 0) !== extras) {
    await asaas('PUT', `/subscriptions/${sub.asaasSubscriptionId}`, { value: valor / 100, updatePendingPayments: true });
  }
  await ref.set({ empresasExtras: extras, updatedAt: new Date().toISOString() }, { merge: true });
  return { extras, valor, ativa: Boolean(ativa) };
}

// Liga uma assinatura do Asaas à conta: grava plano/forma e cancela uma assinatura antiga da mesma conta.
export async function registrarAssinatura(uid, assinatura, extra = {}) {
  if (!adminDb || !uid || !assinatura) return;
  const ref = adminDb.collection('subscriptions').doc(uid);
  const atual = (await ref.get()).data() || {};
  const info = lerRef(assinatura.externalReference) || atual.checkoutPendente || {};
  const planId = info.planId || atual.plano || 'basic';
  const periodo = info.periodo || (assinatura.cycle === 'YEARLY' ? 'anual' : 'mensal');
  const fundador = Boolean(info.fundador);
  const forma = assinatura.billingType === 'CREDIT_CARD' ? 'cartao' : 'pix_boleto';
  // Grava a referência na assinatura (as criadas pelo checkout do cartão nascem sem ela)
  if (!lerRef(assinatura.externalReference)) {
    try { await asaas('PUT', `/subscriptions/${assinatura.id}`, { externalReference: montarRef({ uid, planId, periodo, fundador }) }); } catch (e) { console.warn('Referência da assinatura:', e.message); }
  }
  // Troca de forma de pagamento ou de plano: a assinatura antiga é encerrada (o período já pago continua valendo)
  if (atual.asaasSubscriptionId && atual.asaasSubscriptionId !== assinatura.id && atual.statusAsaas === 'ACTIVE') {
    try { await asaas('DELETE', `/subscriptions/${atual.asaasSubscriptionId}`); } catch (e) { console.warn('Cancelar assinatura antiga:', e.message); }
  }
  const dados = {
    asaasSubscriptionId: assinatura.id,
    asaasCustomerId: assinatura.customer || atual.asaasCustomerId || null,
    statusAsaas: assinatura.status || 'ACTIVE',
    plano: planId, periodo, forma,
    proximoVencimento: assinatura.nextDueDate || null,
    checkoutPendente: null,
    ...(atual.checkoutPendente && atual.checkoutPendente.mesesGratis ? {
      mesesGratis: Math.max(0, (atual.mesesGratis || 0) - atual.checkoutPendente.mesesGratis),
      pagoAte: new Date(Math.max(atual.pagoAte ? Date.parse(atual.pagoAte) : 0, msDaData(assinatura.nextDueDate || new Date().toISOString()))).toISOString(),
    } : {}),
    updatedAt: new Date().toISOString(),
    ...(fundador ? { fundador: true, fundadorAte: atual.fundadorAte || new Date(somarMeses(msDaData(assinatura.nextDueDate || new Date().toISOString()), 12)).toISOString() } : {}),
    ...(atual.faturaPendente && atual.asaasSubscriptionId !== assinatura.id ? { faturaPendente: null } : {}),
    ...extra,
  };
  await ref.set(dados, { merge: true });
  if (atual.asaasSubscriptionId !== assinatura.id) await ativarNotaFiscal(assinatura.id);
  return dados;
}

// Nota fiscal de serviço automática para cada cobrança paga da assinatura (configurado por variáveis no servidor):
//   NFSE_ATIVA=1, NFSE_SERVICO_ID (id de GET /v3/fiscalInfo/services) ou NFSE_SERVICO_CODIGO (código da prefeitura),
//   NFSE_SERVICO_NOME (descrição do serviço) e NFSE_ISS (alíquota do ISS em %, ex.: 2)
export function configNotaFiscal() {
  if (process.env.NFSE_ATIVA !== '1') return null;
  return {
    effectiveDatePeriod: 'ON_PAYMENT_CONFIRMATION',
    ...(process.env.NFSE_SERVICO_ID ? { municipalServiceId: process.env.NFSE_SERVICO_ID } : {}),
    ...(process.env.NFSE_SERVICO_CODIGO ? { municipalServiceCode: process.env.NFSE_SERVICO_CODIGO } : {}),
    municipalServiceName: process.env.NFSE_SERVICO_NOME || 'Licenciamento de uso de software (sistema de gestão financeira)',
    observations: 'Assinatura do sistema Landim Advisory.',
    taxes: { retainIss: false, iss: Number(process.env.NFSE_ISS || 0), cofins: 0, csll: 0, inss: 0, ir: 0, pis: 0 },
  };
}
export async function ativarNotaFiscal(assinaturaId) {
  const cfg = configNotaFiscal();
  if (!cfg || !assinaturaId) return { ativo: false };
  try { await asaas('POST', `/subscriptions/${assinaturaId}/invoiceSettings`, cfg); return { ativo: true }; }
  catch (e) {
    try { await asaas('PUT', `/subscriptions/${assinaturaId}/invoiceSettings`, cfg); return { ativo: true }; }
    catch (e2) { console.warn('Nota fiscal da assinatura', assinaturaId, e2.message); return { ativo: false, erro: e2.message }; }
  }
}

// Descobre de quem é uma cobrança/assinatura do Asaas
export async function uidDoAsaas({ externalReference, customer }) {
  const r = lerRef(externalReference);
  if (r) return r.uid;
  if (customer) {
    const s = await adminDb.collection('asaasClientes').doc(customer).get();
    if (s.exists) return s.data().uid;
  }
  return null;
}

// Cobrança paga (Pix, boleto ou cartão): estende o acesso até o fim do período que ela cobre.
export async function aplicarPagamento(uid, pagamento, ciclo) {
  const ref = adminDb.collection('subscriptions').doc(uid);
  return adminDb.runTransaction(async (t) => {
    const atual = (await t.get(ref)).data() || {};
    const meses = ciclo === 'YEARLY' || atual.periodo === 'anual' ? 12 : 1;
    const inicio = msDaData(pagamento.dueDate);
    const fim = somarMeses(inicio, meses);
    const pagoAte = Math.max(atual.pagoAte ? Date.parse(atual.pagoAte) : 0, fim);
    const dados = { pagoAte: new Date(pagoAte).toISOString(), ultimoPagamento: { id: pagamento.id, valor: pagamento.value, em: new Date().toISOString(), forma: pagamento.billingType }, updatedAt: new Date().toISOString() };
    if (atual.faturaPendente && atual.faturaPendente.id === pagamento.id) dados.faturaPendente = null;
    t.set(ref, dados, { merge: true });
    return dados;
  });
}

// Nova cobrança gerada (ou vencida/recusada): guarda o link para a pessoa pagar pelo painel
export async function guardarFatura(uid, pagamento, situacao) {
  const ref = adminDb.collection('subscriptions').doc(uid);
  const atual = (await ref.get()).data() || {};
  // não troca uma fatura vencida mais antiga por uma futura
  if (atual.faturaPendente && atual.faturaPendente.id !== pagamento.id && atual.faturaPendente.vencimento < pagamento.dueDate && atual.faturaPendente.situacao !== 'paga') return;
  await ref.set({
    faturaPendente: { id: pagamento.id, url: pagamento.invoiceUrl || null, vencimento: pagamento.dueDate, valor: Math.round(Number(pagamento.value || 0) * 100), situacao },
    proximoVencimento: pagamento.dueDate,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function limparFatura(uid, pagamentoId) {
  const ref = adminDb.collection('subscriptions').doc(uid);
  const atual = (await ref.get()).data() || {};
  if (atual.faturaPendente && atual.faturaPendente.id === pagamentoId) await ref.set({ faturaPendente: null }, { merge: true });
}

// Busca no Asaas a assinatura ativa mais recente do cliente e liga à conta (usado também pela página de sucesso)
export async function sincronizarAssinatura(uid, cliente) {
  if (!cliente) return null;
  const lista = await asaas('GET', `/subscriptions?customer=${encodeURIComponent(cliente)}&status=ACTIVE&limit=20`);
  const ativas = (lista.data || []).sort((a, b) => (a.dateCreated < b.dateCreated ? 1 : -1));
  const nova = ativas[0];
  if (!nova) return null;
  const atual = (await adminDb.collection('subscriptions').doc(uid).get()).data() || {};
  if (atual.asaasSubscriptionId === nova.id && atual.statusAsaas === 'ACTIVE') return atual;
  return registrarAssinatura(uid, nova);
}

