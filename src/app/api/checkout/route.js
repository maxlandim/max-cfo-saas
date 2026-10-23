import { NextResponse } from 'next/server';
import { adminConfigurado, adminDb, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { PLANOS, somarMeses } from '../../../lib/plans';
import { vagasFundador } from '../../../lib/fundadores';
import { fimDoTeste, registrarAssinatura, guardarFatura, valorDoPlano, empresasCadastradas, extrasNecessarias } from '../../../lib/assinatura';
import { asaas, asaasConfigurado, linkCheckout, montarRef, dataAsaas, soDigitos, documentoValido } from '../../../lib/asaas';

export const dynamic = 'force-dynamic';

// Abre o pagamento no Asaas.
// POST { planId, periodo: 'mensal'|'anual', forma: 'cartao'|'pix_boleto', nome, documento (CPF ou CNPJ) }
// - cartao: checkout do Asaas que cadastra o cartão e cria a assinatura (1ª cobrança quando o teste grátis acaba)
// - pix_boleto: assinatura em que o Asaas gera uma cobrança por período e envia o link; devolvemos o link da 1ª
export async function POST(req) {
  if (!asaasConfigurado() || !adminConfigurado) {
    return NextResponse.json({ error: 'Os pagamentos ainda não estão configurados. Fale com o suporte.' }, { status: 503 });
  }
  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ error: 'Faça login para assinar.' }, { status: 401 });

  let body = {};
  try { body = await req.json(); } catch {}
  const planId = PLANOS[body.planId] ? body.planId : 'basic';
  const plano = PLANOS[planId];
  const periodo = body.periodo === 'anual' ? 'anual' : 'mensal';
  const forma = body.forma === 'cartao' ? 'cartao' : 'pix_boleto';
  const nome = String(body.nome || '').trim().replace(/\s+/g, ' ').slice(0, 100);
  const documento = soDigitos(body.documento);
  if (nome.length < 3) return NextResponse.json({ error: 'Informe o nome completo ou a razão social.' }, { status: 400 });
  if (!documentoValido(documento)) return NextResponse.json({ error: 'CPF ou CNPJ inválido. Confira os números.' }, { status: 400 });

  const origin = (process.env.NEXT_PUBLIC_SITE_URL || req.headers.get('origin') || `https://${req.headers.get('host')}`).replace(/\/$/, '');
  const ref = adminDb.collection('subscriptions').doc(user.uid);
  const atual = (await ref.get()).data() || {};
  const ativa = atual.asaasSubscriptionId && atual.statusAsaas === 'ACTIVE';
  if (ativa && atual.plano === planId && atual.periodo === periodo && atual.forma === forma) {
    return NextResponse.json({ error: 'Você já tem essa assinatura. Para ver as cobranças ou cancelar, abra "Minha assinatura".' }, { status: 409 });
  }

  // A 1ª cobrança fica para depois do teste grátis e de qualquer período já pago
  let fimTeste = 0;
  try { fimTeste = await fimDoTeste(user.uid); } catch {}
  const pagoAte = atual.pagoAte ? Date.parse(atual.pagoAte) : 0;
  // Meses grátis ganhos por indicação (guardados até a pessoa assinar) empurram a 1ª cobrança
  const mesesGratis = Math.max(0, Math.min(12, Number(atual.mesesGratis) || 0));
  const inicio = somarMeses(Math.max(Date.now(), fimTeste, pagoAte), mesesGratis);
  const primeiraCobranca = dataAsaas(inicio);

  // Preço de fundador: para os primeiros assinantes, por 12 meses
  let fundador = false;
  try {
    const aindaFundador = atual.fundadorAte && Date.parse(atual.fundadorAte) > Date.now();
    fundador = plano.fundador < plano.valor && (aindaFundador || (await vagasFundador({ semCache: true })) > 0);
  } catch {}
  // Empresas a mais que já estão cadastradas no login entram na assinatura
  const extras = extrasNecessarias(planId, await empresasCadastradas(user.uid));
  const valor = valorDoPlano(planId, periodo, fundador, extras) / 100;
  const nomeProduto = `${plano.nome}${periodo === 'anual' ? ' (anual)' : ''}`;
  const descricao = `${nomeProduto}${fundador ? ' · preço de fundador por 12 meses' : ''}${extras ? ` · ${extras} empresa${extras > 1 ? 's' : ''} adicional${extras > 1 ? 'is' : ''}` : ''}`;
  const referencia = montarRef({ uid: user.uid, planId, periodo, fundador });

  try {
    // Cliente no Asaas (um por conta)
    let cliente = atual.asaasCustomerId;
    const dadosCliente = { name: nome, cpfCnpj: documento, email: user.email || undefined, externalReference: user.uid };
    if (cliente) {
      try { await asaas('PUT', `/customers/${cliente}`, dadosCliente); } catch (e) { if (e.status === 404) cliente = null; else throw e; }
    }
    if (!cliente) cliente = (await asaas('POST', '/customers', dadosCliente)).id;
    await adminDb.collection('asaasClientes').doc(cliente).set({ uid: user.uid, em: new Date().toISOString() });
    await ref.set({ asaasCustomerId: cliente, nomeCobranca: nome, documento, empresasExtras: extras, updatedAt: new Date().toISOString() }, { merge: true });

    if (forma === 'cartao') {
      const checkout = await asaas('POST', '/checkouts', {
        billingTypes: ['CREDIT_CARD'],
        chargeTypes: ['RECURRENT'],
        minutesToExpire: 60,
        customer: cliente,
        externalReference: referencia,
        callback: { successUrl: `${origin}/success?forma=cartao`, cancelUrl: `${origin}/pricing`, expiredUrl: `${origin}/pricing` },
        items: [{ name: (plano.nome.replace('Landim Advisory - ', 'Plano ') + (periodo === 'anual' ? ' anual' : '')).slice(0, 30), description: descricao.slice(0, 150), quantity: 1, value: valor }],
        subscription: { cycle: periodo === 'anual' ? 'YEARLY' : 'MONTHLY', nextDueDate: primeiraCobranca },
      });
      await ref.set({ checkoutPendente: { planId, periodo, fundador, mesesGratis, checkoutId: checkout.id, em: new Date().toISOString() } }, { merge: true });
      return NextResponse.json({ url: linkCheckout(checkout.id), primeiraCobranca });
    }

    // Pix ou boleto: o cliente escolhe na página da cobrança (o Asaas também manda o link por e-mail)
    const assinatura = await asaas('POST', '/subscriptions', {
      customer: cliente,
      billingType: 'UNDEFINED',
      value: valor,
      nextDueDate: primeiraCobranca,
      cycle: periodo === 'anual' ? 'YEARLY' : 'MONTHLY',
      description: descricao,
      externalReference: referencia,
    });
    // meses grátis usados contam como período pago até a 1ª cobrança
    await registrarAssinatura(user.uid, assinatura, mesesGratis ? { mesesGratis: 0, pagoAte: new Date(Math.max(inicio, pagoAte)).toISOString() } : {});
    let url = null;
    try {
      const lista = await asaas('GET', `/subscriptions/${assinatura.id}/payments`);
      const pag = (lista.data || []).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0];
      if (pag) { await guardarFatura(user.uid, pag, 'aberta'); url = pag.invoiceUrl || null; }
    } catch (e) { console.warn('Primeira cobrança da assinatura:', e.message); }
    return NextResponse.json({ url: url || `${origin}/success?forma=pix_boleto`, primeiraCobranca });
  } catch (err) {
    console.error('Erro no pagamento do Asaas:', err.status, err.message, JSON.stringify(err.corpo || {}).slice(0, 400));
    const msg = err.status === 400 && err.message && !/Asaas \d/.test(err.message) ? err.message : 'Não foi possível abrir o pagamento agora. Tente de novo em instantes.';
    return NextResponse.json({ error: msg }, { status: err.status === 400 ? 400 : 500 });
  }
}
