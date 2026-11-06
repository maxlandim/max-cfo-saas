import { NextResponse } from 'next/server';
import { adminConfigurado, adminAuth, adminDb, emailsAdmin } from '../../../lib/firebaseAdmin';
import { cronAutorizado, TIPOS_EVENTO, ALERTA_ACIMA_DE } from '../../../lib/seguranca';
import { limparLimites } from '../../../lib/limite';
import { processarExclusoes } from '../../../lib/exclusao';
import { hojeBrasil } from '../../../lib/lembretes';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Manutenção diária (agendada na Vercel em vercel.json e chamada pela /api/rotina no Coolify):
// 1. apaga as contas cuja exclusão foi pedida há 30 dias ou mais;
// 2. apaga os contadores de limite de uso que já venceram;
// 3. confere os eventos de segurança de ontem e de hoje e avisa os administradores por e-mail se algo passou do normal.
export async function GET(req) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!adminConfigurado) return NextResponse.json({ error: 'Configure FIREBASE_SERVICE_ACCOUNT.' }, { status: 503 });
  const r = {};
  try { r.exclusoes = await processarExclusoes(adminDb, adminAuth); } catch (e) { r.exclusoes = { erro: e.message }; }
  try { r.limitesApagados = await limparLimites(adminDb); } catch (e) { r.limitesApagados = { erro: e.message }; }
  try { r.alerta = await alertar(); } catch (e) { r.alerta = { erro: e.message }; }
  return NextResponse.json(r);
}

async function alertar() {
  const dias = [hojeBrasil(new Date(Date.now() - 864e5)), hojeBrasil()];
  const acima = [];
  for (const dia of dias) {
    const ref = adminDb.collection('seguranca').doc(dia);
    const d = (await ref.get()).data();
    if (!d || d.alertaEnviado) continue;
    const itens = Object.entries(d.tipos || {}).filter(([k, v]) => v > (ALERTA_ACIMA_DE[k] || Infinity));
    if (!itens.length) continue;
    acima.push({ dia, itens, ref });
  }
  if (!acima.length) return { enviado: false };
  const para = emailsAdmin();
  if (!para.length || !process.env.RESEND_API_KEY) return { enviado: false, motivo: 'sem ADMIN_EMAILS ou RESEND_API_KEY', acima: acima.map((a) => a.dia) };
  const linhas = acima.map((a) => `<p><b>${a.dia.split('-').reverse().join('/')}</b><br>${a.itens.map(([k, v]) => `${TIPOS_EVENTO[k] || k}: <b>${v}</b> (normal: até ${ALERTA_ACIMA_DE[k]})`).join('<br>')}</p>`).join('');
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://landimadvisory.com.br').replace(/\/$/, '');
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px">
<h2 style="color:#B42318">Alerta de segurança — Landim Advisory</h2>
<p>A contagem de eventos suspeitos passou do normal:</p>${linhas}
<p>Abra o <a href="${site}/admin">painel do administrador</a> (cartão Segurança) e siga o plano de resposta a incidentes (SEGURANCA.md no repositório).</p></div>`;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.LEMBRETES_REMETENTE || 'Landim Advisory <avisos@landimadvisory.com.br>', to: para, subject: '⚠️ Alerta de segurança — Landim Advisory', html }),
  });
  if (!resp.ok) throw new Error('Resend ' + resp.status);
  await Promise.all(acima.map((a) => a.ref.set({ alertaEnviado: new Date().toISOString() }, { merge: true })));
  return { enviado: true, dias: acima.map((a) => a.dia) };
}
