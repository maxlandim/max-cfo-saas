import { NextResponse } from 'next/server';
import { adminConfigurado, adminDb } from '../../../lib/firebaseAdmin';
import { PLANOS, MESES_PAGOS_NO_ANUAL } from '../../../lib/plans';
import { asaas, asaasConfigurado, lerRef, msDaData } from '../../../lib/asaas';
import { uidDoAsaas, registrarAssinatura, aplicarPagamento, guardarFatura, limparFatura, sincronizarAssinatura } from '../../../lib/assinatura';

export const dynamic = 'force-dynamic';

// Webhook do Asaas: https://landimadvisory.com.br/api/asaas
// No Asaas (Integrações > Webhooks), use o mesmo token de ASAAS_WEBHOOK_TOKEN e marque os eventos de
// cobranças, assinaturas e checkout. Cada evento é processado uma única vez (eventosAsaas/{id}).
export async function POST(req) {
  if (!adminConfigurado || !asaasConfigurado() || !process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 503 });
  }
  if (req.headers.get('asaas-access-token') !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
  }
  let ev;
  try { ev = await req.json(); } catch { return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 }); }
  if (!ev || !ev.event) return NextResponse.json({ ok: true });

  // Entrega "pelo menos uma vez": ignora o que já foi processado
  const marca = ev.id ? adminDb.collection('eventosAsaas').doc(String(ev.id)) : null;
  if (marca && (await marca.get()).exists) return NextResponse.json({ ok: true, repetido: true });

  try {
    await processar(ev);
    if (marca) await marca.set({ event: ev.event, em: new Date().toISOString() });
  } catch (e) {
    console.error('Webhook do Asaas:', ev.event, e.status || '', e.message);
    return NextResponse.json({ error: 'Erro ao processar.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

async function assinaturaAtual(uid) {
  return (await adminDb.collection('subscriptions').doc(uid).get()).data() || {};
}

async function processar(ev) {
  const tipo = ev.event;

  if (ev.payment) {
    const p = ev.payment;
    if (!p.subscription) return; // só cobranças das assinaturas do sistema
    const uid = await uidDoAsaas(p);
    if (!uid) return;
    const atual = await assinaturaAtual(uid);
    const daAtual = !atual.asaasSubscriptionId || atual.asaasSubscriptionId === p.subscription;
    if (tipo === 'PAYMENT_CONFIRMED' || tipo === 'PAYMENT_RECEIVED') {
      await aplicarPagamento(uid, p, atual.periodo === 'anual' ? 'YEARLY' : 'MONTHLY');
      return;
    }
    if (!daAtual) return;
    if (tipo === 'PAYMENT_CREATED' || tipo === 'PAYMENT_UPDATED' || tipo === 'PAYMENT_RESTORED') {
      if (p.status === 'PENDING' || p.status === 'OVERDUE') await guardarFatura(uid, p, p.status === 'OVERDUE' ? 'vencida' : 'aberta');
      if (tipo === 'PAYMENT_CREATED') await fimDoPrecoDeFundador(uid, atual, p);
      return;
    }
    if (tipo === 'PAYMENT_OVERDUE') return guardarFatura(uid, p, 'vencida');
    if (tipo === 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED' || tipo === 'PAYMENT_REPROVED_BY_RISK_ANALYSIS') return guardarFatura(uid, p, 'recusada');
    if (tipo === 'PAYMENT_DELETED' || tipo === 'PAYMENT_REFUNDED') return limparFatura(uid, p.id);
    return;
  }

  if (ev.subscription) {
    const s = ev.subscription;
    const uid = await uidDoAsaas(s);
    if (!uid) return;
    const atual = await assinaturaAtual(uid);
    if (tipo === 'SUBSCRIPTION_CREATED') {
      // criada pelo checkout do cartão (ou pela própria rota de Pix/boleto)
      if (atual.asaasSubscriptionId === s.id || atual.checkoutPendente || lerRef(s.externalReference)) await registrarAssinatura(uid, s);
      return;
    }
    if (atual.asaasSubscriptionId !== s.id) return; // assinatura antiga
    const ref = adminDb.collection('subscriptions').doc(uid);
    if (tipo === 'SUBSCRIPTION_UPDATED') {
      await ref.set({ statusAsaas: s.status || atual.statusAsaas, proximoVencimento: s.nextDueDate || atual.proximoVencimento || null, forma: s.billingType === 'CREDIT_CARD' ? 'cartao' : 'pix_boleto', updatedAt: new Date().toISOString() }, { merge: true });
    } else if (tipo === 'SUBSCRIPTION_INACTIVATED' || tipo === 'SUBSCRIPTION_DELETED') {
      await ref.set({ statusAsaas: tipo === 'SUBSCRIPTION_DELETED' ? 'DELETED' : 'INACTIVE', faturaPendente: null, updatedAt: new Date().toISOString() }, { merge: true });
    }
    return;
  }

  if (ev.checkout && tipo === 'CHECKOUT_PAID') {
    // Checkout do cartão concluído: procura a assinatura criada para esse cliente
    const cliente = typeof ev.checkout.customer === 'string' ? ev.checkout.customer : ev.checkout.customer?.id;
    const uid = await uidDoAsaas({ customer: cliente });
    if (uid) await sincronizarAssinatura(uid, cliente);
  }
}

// Depois de 12 meses com preço de fundador, a assinatura passa para o preço normal
async function fimDoPrecoDeFundador(uid, atual, p) {
  if (!atual.fundador || !atual.fundadorAte || !atual.asaasSubscriptionId) return;
  if (msDaData(p.dueDate) < Date.parse(atual.fundadorAte)) return;
  const plano = PLANOS[atual.plano];
  if (!plano) return;
  const normal = (plano.valor * (atual.periodo === 'anual' ? MESES_PAGOS_NO_ANUAL : 1)) / 100;
  if (Number(p.value) >= normal) return;
  try {
    await asaas('PUT', `/subscriptions/${atual.asaasSubscriptionId}`, { value: normal, updatePendingPayments: true, description: plano.nome + (atual.periodo === 'anual' ? ' (anual)' : '') });
  } catch (e) { console.warn('Fim do preço de fundador:', e.message); }
}
