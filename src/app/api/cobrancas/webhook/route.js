import { NextResponse } from 'next/server';
import { adminConfigurado, adminDb } from '../../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

// Avisos do Asaas da empresa (conta do cliente do sistema): POST /api/cobrancas/webhook?ws=<empresa>
// O evento fica guardado até o painel da empresa buscar e dar a baixa no lançamento.
export async function POST(req) {
  if (!adminConfigurado) return NextResponse.json({ error: 'Servidor sem configuração.' }, { status: 503 });
  const wsId = new URL(req.url).searchParams.get('ws') || '';
  const cfg = wsId ? (await adminDb.collection('cobrancaAsaas').doc(wsId).get()).data() : null;
  if (!cfg || !cfg.webhookToken || req.headers.get('asaas-access-token') !== cfg.webhookToken) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
  let ev;
  try { ev = await req.json(); } catch { return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 }); }
  const p = ev && ev.payment;
  if (!p || !p.id) return NextResponse.json({ ok: true });
  const [ws, txId] = String(p.externalReference || '').split('|');
  if (ws !== wsId || !txId) return NextResponse.json({ ok: true, ignorado: true }); // cobrança feita fora do sistema
  const ref = adminDb.collection('cobrancaEventos').doc(wsId).collection('itens').doc(p.id);
  const atual = (await ref.get()).data();
  // eventos de pagamento valem mais que os de criação/atualização que chegam depois
  const pago = (s) => ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(s);
  if (atual && pago(atual.status) && !pago(p.status) && !['PAYMENT_REFUNDED', 'PAYMENT_DELETED'].includes(ev.event)) return NextResponse.json({ ok: true });
  await ref.set({
    txId, evento: ev.event, status: p.status, valor: Number(p.value) || 0, valorLiquido: Number(p.netValue) || null,
    pagoEm: p.clientPaymentDate || p.paymentDate || p.confirmedDate || null, forma: p.billingType || null,
    url: p.invoiceUrl || null, vencimento: p.dueDate || null, em: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}
