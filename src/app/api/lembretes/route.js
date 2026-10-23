import { NextResponse } from 'next/server';
import { adminConfigurado, adminAuth, adminDb, usuarioDaRequisicao, emailsAdmin } from '../../../lib/firebaseAdmin';
import { statusDoUsuario } from '../../../lib/assinatura';
import { config, hojeBrasil, resumoDono, avisosClientes } from '../../../lib/lembretes';
import { estadoDoEspaco, temDados } from '../../../lib/espacoServidor';
import { emailDoDia, montarEmailTeste } from '../../../lib/emailsTeste';
import { vagasFundador } from '../../../lib/fundadores';
import { DIAS_DE_TESTE } from '../../../lib/plans';

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
    if (!dono || !donoDoEspaco(dono, wsId) || !temDados(dados)) continue;
    resultado.empresas++;
    // Uma rodada por empresa por dia, mesmo que a tarefa rode duas vezes
    const marca = adminDb.collection('lembretesEnviados').doc(`${wsId}_${hoje}`);
    try {
      if ((await marca.get()).exists) { resultado.puladas++; continue; }
      if (!(await temAcesso(dono))) { resultado.puladas++; continue; }
      const estado = (await estadoDoEspaco(adminDb, wsId, dados)) || {};
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
  // E-mails do teste grátis: boas-vindas, dica, "acaba amanhã" e "acabou" (uma vez cada, só para quem não assinou)
  resultado.emailsTeste = 0;
  try {
    const fundador = (await vagasFundador()) > 0;
    const admins = emailsAdmin();
    const agora = Date.now();
    let token;
    for (let pagina = 0; pagina < 10; pagina++) {
      const lista = await adminAuth.listUsers(1000, token);
      for (const u of lista.users) {
        const email = (u.email || '').toLowerCase();
        const dias = (agora - new Date(u.metadata.creationTime).getTime()) / 864e5;
        if (!email || dias > DIAS_DE_TESTE + 4 || admins.includes(email) || /@exemplo\.com$/.test(email)) continue;
        const ref = adminDb.collection('emailsTeste').doc(u.uid);
        const enviados = (await ref.get()).data() || {};
        if (enviados.sair) continue;
        const sub = (await adminDb.collection('subscriptions').doc(u.uid).get()).data() || {};
        const temAssinatura = (sub.asaasSubscriptionId && sub.statusAsaas === 'ACTIVE') || (sub.pagoAte && Date.parse(sub.pagoAte) > agora);
        const tipo = emailDoDia(Math.floor(dias), enviados, temAssinatura);
        if (!tipo) continue;
        const m = montarEmailTeste(tipo, { nome: u.displayName || '', site: site(), uid: u.uid, fundador });
        try {
          await enviar({ para: email, assunto: m.assunto, html: m.html, responderPara: process.env.EMAIL_RESPOSTA || admins[0] || undefined });
          await ref.set({ [tipo]: new Date().toISOString() }, { merge: true });
          resultado.emailsTeste++;
        } catch (e) { resultado.erros.push(`e-mail ${tipo} ${u.uid}: ${e.message}`); }
      }
      token = lista.pageToken;
      if (!token) break;
    }
  } catch (e) { resultado.erros.push('e-mails do teste: ' + e.message); }

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
  if (!snap.exists || !temDados(snap.data())) return NextResponse.json({ error: 'Salve algum lançamento antes de testar.' }, { status: 400 });
  const estado = (await estadoDoEspaco(adminDb, wsId, snap.data())) || {};
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
