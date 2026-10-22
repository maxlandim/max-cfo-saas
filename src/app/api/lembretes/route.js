import { NextResponse } from 'next/server';
import { adminConfigurado, adminAuth, adminDb, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { statusDoUsuario } from '../../../lib/assinatura';
import { config, hojeBrasil, resumoDono, avisosClientes } from '../../../lib/lembretes';
import { STATUS_ATIVOS } from '../../../lib/plans';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Lembretes de vencimento por e-mail.
// GET  /api/lembretes  com "Authorization: Bearer <CRON_SECRET>" (ou ?chave=<CRON_SECRET>): roda para todas as empresas.
//      Feito para uma tarefa agendada no servidor, uma vez por dia (ex.: 7h).
// POST /api/lembretes  com o login do usuário: envia agora um resumo de teste da empresa aberta para o próprio dono.

const site = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://landimadvisory.com.br').replace(/\/$/, '');
const remetente = () => process.env.LEMBRETES_REMETENTE || 'Landim Advisory <avisos@landimadvisory.com.br>';

async function enviar({ para, assunto, html, responderPara }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: remetente(), to: [para], subject: assunto, html, ...(responderPara ? { reply_to: responderPara } : {}) }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Resend ${r.status}: ${t.slice(0, 200)}`);
  }
}

function faltando() {
  const f = [];
  if (!adminConfigurado) f.push('FIREBASE_SERVICE_ACCOUNT');
  if (!process.env.RESEND_API_KEY) f.push('RESEND_API_KEY');
  return f;
}

function donoDoEspaco(uid, wsId) { return wsId === uid || new RegExp('^' + uid + '__[a-z0-9]{4,24}$').test(wsId); }

const emailsDono = new Map();
async function emailDoDono(uid) {
  if (!emailsDono.has(uid)) {
    try { const u = await adminAuth.getUser(uid); emailsDono.set(uid, (u.email || '').toLowerCase()); } catch { emailsDono.set(uid, ''); }
  }
  return emailsDono.get(uid);
}
const acessos = new Map();
async function temAcesso(uid) {
  if (!acessos.has(uid)) {
    try { const email = await emailDoDono(uid); acessos.set(uid, (await statusDoUsuario({ uid, email })).acesso); } catch { acessos.set(uid, false); }
  }
  return acessos.get(uid);
}

export async function GET(req) {
  const segredo = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const h = req.headers.get('authorization') || '';
  const dado = h.startsWith('Bearer ') ? h.slice(7) : url.searchParams.get('chave');
  if (!segredo || dado !== segredo) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const f = faltando();
  if (f.length) return NextResponse.json({ error: 'Configure no servidor: ' + f.join(', ') }, { status: 503 });

  const hoje = hojeBrasil();
  const resultado = { hoje, empresas: 0, resumos: 0, avisos: 0, puladas: 0, erros: [] };
  const espacos = await adminDb.collection('workspaces').get();
  for (const d of espacos.docs) {
    const wsId = d.id, dados = d.data() || {};
    const dono = dados.owner;
    if (!dono || !donoDoEspaco(dono, wsId) || !dados.data) continue;
    resultado.empresas++;
    // Uma rodada por empresa por dia, mesmo que a tarefa rode duas vezes
    const marca = adminDb.collection('lembretesEnviados').doc(`${wsId}_${hoje}`);
    try {
      if ((await marca.get()).exists) { resultado.puladas++; continue; }
      if (!(await temAcesso(dono))) { resultado.puladas++; continue; }
      const estado = JSON.parse(dados.data);
      const cfg = config(estado);
      const emailDono = (cfg.email || (await emailDoDono(dono)) || '').trim();
      let resumos = 0, avisos = 0;
      if (cfg.resumoDono && emailDono) {
        const r = resumoDono(estado, hoje, site());
        if (r) { await enviar({ para: emailDono, assunto: r.assunto, html: r.html }); resumos++; }
      }
      for (const a of avisosClientes(estado, hoje, cfg).slice(0, 100)) {
        try { await enviar({ para: a.para, assunto: a.assunto, html: a.html, responderPara: emailDono || undefined }); avisos++; }
        catch (e) { resultado.erros.push(`${wsId}: ${e.message}`); }
      }
      await marca.set({ wsId, dia: hoje, resumos, avisos, em: new Date().toISOString() });
      resultado.resumos += resumos; resultado.avisos += avisos;
    } catch (e) {
      console.error('Lembretes', wsId, e);
      resultado.erros.push(`${wsId}: ${e.message}`);
    }
  }
  // Quem pagou por Pix ou boleto recebe aviso 5 dias antes e no último dia do período pago
  resultado.renovacoes = 0;
  try {
    const agora = Date.now();
    const subs = await adminDb.collection('subscriptions').where('pagoAte', '>', new Date(agora).toISOString()).get();
    for (const d of subs.docs) {
      const s = d.data();
      if (STATUS_ATIVOS.includes(s.status)) continue; // já assina no cartão
      const dias = Math.ceil((Date.parse(s.pagoAte) - agora) / 864e5);
      const etapa = dias === 5 ? '5' : dias <= 1 ? '1' : null;
      if (!etapa) continue;
      const marca = adminDb.collection('lembretesEnviados').doc(`renovacao_${d.id}_${s.pagoAte.slice(0, 10)}_${etapa}`);
      if ((await marca.get()).exists) continue;
      const para = await emailDoDono(d.id);
      if (!para) continue;
      const data = new Date(s.pagoAte).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const link = `${site()}/pricing?utm_source=email`;
      try {
        await enviar({
          para,
          assunto: etapa === '1' ? 'Seu acesso à Landim Advisory vence amanhã' : `Seu acesso à Landim Advisory vence em ${data}`,
          html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#0B1220;line-height:1.55;max-width:520px">
<p>Olá!</p>
<p>O período que você pagou por Pix ou boleto vale até <b>${data}</b>. Para não perder o acesso ao painel, renove antes dessa data.</p>
<p><a href="${link}" style="display:inline-block;background:#C5A059;color:#0B1220;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">Renovar agora</a></p>
<p style="color:#5B6474;font-size:13px">O Pix libera na hora. O boleto leva até 1 dia útil para compensar. Se preferir não se preocupar com isso, escolha o cartão: a renovação fica automática e a primeira cobrança só acontece quando o período pago acabar.</p>
<p style="color:#5B6474;font-size:13px">Seus dados continuam guardados mesmo se o período vencer.</p>
</div>`,
        });
        await marca.set({ uid: d.id, etapa, pagoAte: s.pagoAte, em: new Date().toISOString() });
        resultado.renovacoes++;
      } catch (e) { resultado.erros.push(`renovação ${d.id}: ${e.message}`); }
    }
  } catch (e) { resultado.erros.push('renovações: ' + e.message); }

  return NextResponse.json(resultado);
}

export async function POST(req) {
  const f = faltando();
  if (f.length) return NextResponse.json({ error: 'Os lembretes por e-mail ainda não foram ativados no servidor (falta ' + f.join(', ') + ').' }, { status: 503 });
  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  const wsId = String(body.wsId || '');
  if (!donoDoEspaco(user.uid, wsId)) return NextResponse.json({ error: 'Só o dono da empresa pode enviar o teste.' }, { status: 403 });
  const snap = await adminDb.collection('workspaces').doc(wsId).get();
  if (!snap.exists || !snap.data().data) return NextResponse.json({ error: 'Salve algum lançamento antes de testar.' }, { status: 400 });
  const estado = JSON.parse(snap.data().data);
  const cfg = config(estado);
  const para = (cfg.email || user.email || '').trim();
  if (!para) return NextResponse.json({ error: 'Informe o e-mail que recebe o resumo.' }, { status: 400 });
  const hoje = hojeBrasil();
  const r = resumoDono(estado, hoje, site());
  const avisos = avisosClientes(estado, hoje, cfg);
  try {
    if (r) await enviar({ para, assunto: '[Teste] ' + r.assunto, html: r.html });
    else await enviar({ para, assunto: '[Teste] Lembretes da Landim Advisory ligados', html: `<p style="font-family:Arial">Tudo certo! Os lembretes estão funcionando. Hoje não há contas vencidas nem vencendo nos próximos 7 dias, então o resumo diário não seria enviado.</p>` });
    // Mostra ao dono como o cliente recebe (sem mandar para o cliente)
    if (avisos[0]) await enviar({ para, assunto: '[Teste: como o cliente recebe] ' + avisos[0].assunto, html: avisos[0].html });
  } catch (e) {
    console.error('Teste de lembrete:', e);
    return NextResponse.json({ error: 'O provedor de e-mail recusou o envio. Confira a RESEND_API_KEY e se o domínio do remetente foi verificado no Resend.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, para, resumo: !!r, avisosHoje: avisos.length });
}
