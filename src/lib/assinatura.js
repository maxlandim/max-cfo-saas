// Regras de acesso pago, calculadas sempre no servidor.
// O documento subscriptions/{uid} só é escrito pelo servidor (webhook do Stripe e confirmação do checkout);
// as regras do Firestore impedem o próprio usuário de alterá-lo.
import { adminAuth, adminDb, emailsAdmin } from './firebaseAdmin';
import { DIAS_DE_TESTE, STATUS_ATIVOS } from './plans';

export async function statusDoUsuario(decoded) {
  const uid = decoded.uid;
  const email = (decoded.email || '').toLowerCase();

  if (email && emailsAdmin().includes(email)) {
    return { acesso: true, motivo: 'admin', plano: 'unlimited' };
  }

  const snap = await adminDb.collection('subscriptions').doc(uid).get();
  const sub = snap.exists ? snap.data() : null;
  if (sub && STATUS_ATIVOS.includes(sub.status)) {
    return { acesso: true, motivo: 'assinatura', plano: sub.plan || null, status: sub.status, renovaEm: sub.currentPeriodEnd || null };
  }

  // Teste grátis contado a partir da criação da conta
  const user = await adminAuth.getUser(uid);
  const criadoEm = new Date(user.metadata.creationTime).getTime();
  const fimTeste = criadoEm + DIAS_DE_TESTE * 864e5;
  if (Date.now() < fimTeste) {
    return {
      acesso: true,
      motivo: 'teste',
      testeTerminaEm: new Date(fimTeste).toISOString(),
      diasRestantes: Math.ceil((fimTeste - Date.now()) / 864e5),
      status: sub?.status || null,
    };
  }

  return { acesso: false, motivo: sub?.status === 'past_due' ? 'pagamento_pendente' : 'sem_assinatura', status: sub?.status || null };
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
