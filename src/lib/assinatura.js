// Regras de acesso pago, calculadas sempre no servidor.
// O documento subscriptions/{uid} só é escrito pelo servidor (webhook do Stripe e confirmação do checkout);
// as regras do Firestore impedem o próprio usuário de alterá-lo.
//
// Duas formas de pagar:
// - Cartão: assinatura do Stripe (status, plan, stripeSubscriptionId, currentPeriodEnd...), renova sozinha.
// - Pix ou boleto: pagamento avulso que libera o plano até "pagoAte" (planoAvulso, periodoAvulso), sem renovação.
import { adminAuth, adminDb, emailsAdmin } from './firebaseAdmin';
import { DIAS_DE_TESTE, STATUS_ATIVOS, somarMeses } from './plans';

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

  const snap = await adminDb.collection('subscriptions').doc(uid).get();
  const sub = snap.exists ? snap.data() : null;
  if (sub && STATUS_ATIVOS.includes(sub.status)) {
    return { acesso: true, motivo: 'assinatura', forma: 'cartao', plano: sub.plan || null, status: sub.status, renovaEm: sub.currentPeriodEnd || null };
  }

  const agora = Date.now();
  const fimTeste = await fimDoTeste(uid);
  const pagoAte = sub && sub.pagoAte ? Date.parse(sub.pagoAte) : 0;
  const boleto = sub && sub.boletoPendente && Date.parse(sub.boletoPendente.ate) > agora ? sub.boletoPendente : null;

  // Pix ou boleto pago: libera até pagoAte. Pago durante o teste grátis, o período começa quando o teste acaba
  // e até lá a pessoa continua com tudo liberado (como no cartão, status "trialing").
  if (pagoAte > agora) {
    return {
      acesso: true, motivo: 'assinatura', forma: 'avulso', plano: sub.planoAvulso || null,
      status: agora < fimTeste ? 'trialing' : 'active', periodo: sub.periodoAvulso || 'mensal',
      pagoAte: sub.pagoAte, renovaEm: sub.pagoAte, diasParaVencer: Math.ceil((pagoAte - agora) / 864e5),
      ...(boleto ? { boletoPendente: boleto } : {}),
    };
  }

  // Teste grátis contado a partir da criação da conta
  if (agora < fimTeste) {
    return {
      acesso: true,
      motivo: 'teste',
      testeTerminaEm: new Date(fimTeste).toISOString(),
      diasRestantes: Math.ceil((fimTeste - agora) / 864e5),
      status: sub?.status || null,
      ...(boleto ? { boletoPendente: boleto } : {}),
    };
  }

  return {
    acesso: false,
    motivo: boleto ? 'aguardando_boleto' : sub?.status === 'past_due' ? 'pagamento_pendente' : pagoAte ? 'periodo_vencido' : 'sem_assinatura',
    status: sub?.status || null,
    ...(pagoAte ? { pagoAte: sub.pagoAte } : {}),
    ...(boleto ? { boletoPendente: boleto } : {}),
  };
}

// Grava/atualiza a assinatura a partir de um objeto Subscription do Stripe.
export async function gravarAssinatura(uid, subscription, extra = {}) {
  if (!uid || !adminDb) return;
  await adminDb.collection('subscriptions').doc(uid).set(
    {
      status: subscription.status,
      plan: subscription.metadata?.planId || extra.plan || null,
      stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || null,
      stripeSubscriptionId: subscription.id,
      // Versões novas da API do Stripe trazem o fim do período em cada item da assinatura
      currentPeriodEnd: (() => { const f = subscription.current_period_end || subscription.items?.data?.[0]?.current_period_end; return f ? new Date(f * 1000).toISOString() : null; })(),
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      fundador: subscription.metadata?.fundador === '1',
      periodo: subscription.metadata?.periodo || 'mensal',
      updatedAt: new Date().toISOString(),
      ...extra,
    },
    { merge: true }
  );
}

// Credita um pagamento avulso (Pix ou boleto) já pago: soma 1 ou 12 meses ao acesso.
// Pode ser chamado mais de uma vez para a mesma sessão (webhook + página de sucesso): só credita uma vez.
export async function creditarAvulso(session) {
  if (!adminDb || !session || session.payment_status !== 'paid') return null;
  const m = session.metadata || {};
  const uid = session.client_reference_id || m.uid;
  if (!uid || m.tipo !== 'avulso') return null;
  const meses = m.periodo === 'anual' ? 12 : 1;
  const fimTeste = await fimDoTeste(uid).catch(() => 0);
  const refSub = adminDb.collection('subscriptions').doc(uid);
  const refPag = adminDb.collection('pagamentosAvulsos').doc(session.id);
  return adminDb.runTransaction(async (t) => {
    const [pag, atual] = await Promise.all([t.get(refPag), t.get(refSub)]);
    if (pag.exists) return pag.data();
    const sub = atual.exists ? atual.data() : {};
    const agora = Date.now();
    const pagoAteAntes = sub.pagoAte ? Date.parse(sub.pagoAte) : 0;
    const inicio = Math.max(agora, fimTeste, pagoAteAntes);
    const pagoAte = new Date(somarMeses(inicio, meses)).toISOString();
    const fundador = m.fundador === '1';
    const dados = {
      pagoAte, planoAvulso: m.planId || 'basic', periodoAvulso: m.periodo === 'anual' ? 'anual' : 'mensal',
      formaAvulso: (session.payment_method_types || []).join(',') || 'pix',
      stripeCustomerId: sub.stripeCustomerId || (typeof session.customer === 'string' ? session.customer : session.customer?.id) || null,
      updatedAt: new Date().toISOString(),
      ...(fundador ? { fundador: true, fundadorAte: sub.fundadorAte || new Date(somarMeses(agora, 12)).toISOString() } : {}),
      ...(sub.boletoPendente && sub.boletoPendente.sessionId === session.id ? { boletoPendente: null } : {}),
    };
    t.set(refSub, dados, { merge: true });
    const registro = { uid, sessionId: session.id, valor: session.amount_total, plano: dados.planoAvulso, periodo: dados.periodoAvulso, de: new Date(inicio).toISOString(), ate: pagoAte, fundador, em: new Date().toISOString() };
    t.set(refPag, registro);
    return registro;
  });
}

// Boleto gerado e ainda não pago: guarda o link para a pessoa achar o boleto no painel.
export async function marcarBoletoPendente(uid, session, voucherUrl) {
  if (!adminDb || !uid) return;
  const ate = new Date(Date.now() + 4 * 864e5).toISOString(); // vence em 3 dias + 1 dia útil para compensar
  await adminDb.collection('subscriptions').doc(uid).set({
    boletoPendente: { sessionId: session.id, url: voucherUrl || null, plano: session.metadata?.planId || null, periodo: session.metadata?.periodo || 'mensal', valor: session.amount_total || 0, ate },
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function limparBoletoPendente(uid, sessionId) {
  if (!adminDb || !uid) return;
  const ref = adminDb.collection('subscriptions').doc(uid);
  const snap = await ref.get();
  if (snap.exists && snap.data().boletoPendente?.sessionId === sessionId) await ref.set({ boletoPendente: null }, { merge: true });
}
