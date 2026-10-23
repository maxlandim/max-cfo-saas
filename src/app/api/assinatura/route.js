import { NextResponse } from 'next/server';
import { adminConfigurado, adminDb, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { statusDoUsuario } from '../../../lib/assinatura';
import { asaas, asaasConfigurado } from '../../../lib/asaas';

export const dynamic = 'force-dynamic';

// GET: dados da assinatura para a página "Minha assinatura" (e para preencher nome e CPF/CNPJ no pagamento)
export async function GET(req) {
  if (!adminConfigurado) return NextResponse.json({ error: 'Servidor sem configuração.' }, { status: 503 });
  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });
  const sub = (await adminDb.collection('subscriptions').doc(user.uid).get()).data() || {};
  const status = await statusDoUsuario(user);
  let cobrancas = [];
  if (asaasConfigurado() && sub.asaasSubscriptionId) {
    try {
      const lista = await asaas('GET', `/subscriptions/${sub.asaasSubscriptionId}/payments?limit=12`);
      cobrancas = (lista.data || []).map((p) => ({ vencimento: p.dueDate, valor: Math.round(Number(p.value) * 100), situacao: p.status, forma: p.billingType, url: p.invoiceUrl || null, recibo: p.transactionReceiptUrl || null }))
        .sort((a, b) => (a.vencimento < b.vencimento ? 1 : -1));
    } catch (e) { console.warn('Cobranças da assinatura:', e.message); }
  }
  return NextResponse.json({
    status,
    nome: sub.nomeCobranca || user.name || '',
    documento: sub.documento || '',
    ativa: Boolean(sub.asaasSubscriptionId) && sub.statusAsaas === 'ACTIVE',
    plano: sub.plano || null, periodo: sub.periodo || null, forma: sub.forma || null,
    proximoVencimento: sub.proximoVencimento || null, pagoAte: sub.pagoAte || null, fundador: Boolean(sub.fundador), fundadorAte: sub.fundadorAte || null,
    cobrancas,
  });
}

// POST { acao: 'cancelar' }: encerra a assinatura no Asaas (o período já pago continua valendo)
export async function POST(req) {
  if (!adminConfigurado || !asaasConfigurado()) return NextResponse.json({ error: 'Pagamentos ainda não configurados.' }, { status: 503 });
  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  if (body.acao !== 'cancelar') return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  const ref = adminDb.collection('subscriptions').doc(user.uid);
  const sub = (await ref.get()).data() || {};
  if (!sub.asaasSubscriptionId || sub.statusAsaas !== 'ACTIVE') return NextResponse.json({ error: 'Não há assinatura ativa nesta conta.' }, { status: 404 });
  try {
    await asaas('DELETE', `/subscriptions/${sub.asaasSubscriptionId}`);
  } catch (e) {
    if (e.status !== 404) { console.error('Cancelar assinatura:', e.message); return NextResponse.json({ error: 'Não consegui cancelar agora. Tente de novo ou fale no WhatsApp.' }, { status: 500 }); }
  }
  await ref.set({ statusAsaas: 'DELETED', faturaPendente: null, canceladaEm: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
  return NextResponse.json({ ok: true, status: await statusDoUsuario(user) });
}
