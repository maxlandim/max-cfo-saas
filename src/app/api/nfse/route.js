import { NextResponse } from 'next/server';
import { adminAuth, adminConfigurado, adminDb, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { donoDoEspaco } from '../../../lib/asaasCliente';
import { statusDoUsuario } from '../../../lib/assinatura';
import { nivelDoStatus } from '../../../lib/plans';
import { limiteExcedido } from '../../../lib/limite';
import {
  carregar, resumo, salvarConfig, salvarCertificado, removerCertificado, testarConexao, emitir, cancelar, listar, xmlDaNota,
  ErroCertificado, ErroEmissor,
} from '../../../lib/nfse/emissor';
import { consultaPublica } from '../../../lib/nfse/sefin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Emissor próprio de NFS-e (padrão nacional). O certificado A1 e a senha ficam cifrados no servidor e nunca voltam ao navegador.
// Dono da empresa: configura, envia o certificado, emite e cancela.
// Analista ou gestor convidado (com e-mail confirmado): emite e cancela, sem ver nem trocar o certificado.

async function papelNoEspaco(user, wsId) {
  if (donoDoEspaco(user.uid, wsId)) return 'dono';
  const email = String(user.email || '').toLowerCase();
  if (!email || !user.email_verified) return null;
  const c = (await adminDb.collection('convites').doc(email).collection('espacos').doc(wsId).get()).data();
  return c && ['analista', 'gestor'].includes(c.papel) ? 'equipe' : null;
}

async function planoPermite(wsId) {
  const uid = String(wsId).split('__')[0];
  let email = '';
  try { email = (await adminAuth.getUser(uid)).email || ''; } catch { /* sem e-mail */ }
  const st = await statusDoUsuario({ uid, email });
  return nivelDoStatus(st) >= 2;
}

async function entrada(req, wsId, { soDono = false } = {}) {
  if (!adminConfigurado) return [null, null, NextResponse.json({ error: 'Servidor sem configuração.' }, { status: 503 })];
  const user = await usuarioDaRequisicao(req);
  if (!user) return [null, null, NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 })];
  if (!/^[\w-]{6,80}$/.test(wsId)) return [null, null, NextResponse.json({ error: 'Empresa inválida.' }, { status: 400 })];
  const papel = await papelNoEspaco(user, wsId);
  if (!papel || (soDono && papel !== 'dono')) return [null, null, NextResponse.json({ error: soDono ? 'Só o dono da empresa configura a emissão e o certificado.' : 'Sem acesso à emissão de notas desta empresa.' }, { status: 403 })];
  return [user, papel, null];
}

function erro(e, contexto) {
  if (e instanceof ErroCertificado) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof ErroEmissor) return NextResponse.json({ error: e.message, erros: e.erros, codigos: e.codigos, semResposta: e.semResposta }, { status: e.status || 400 });
  console.error('NFS-e', contexto, e && e.message);
  return NextResponse.json({ error: 'Não consegui concluir agora. Tente de novo em instantes.' }, { status: 500 });
}

// GET ?wsId=                  situação do emissor (certificado sem segredos, configuração, o que falta)
// GET ?wsId=&lista=1          notas emitidas por aqui
// GET ?wsId=&xml=<chave>      XML oficial da NFS-e
export async function GET(req) {
  const u = new URL(req.url);
  const wsId = u.searchParams.get('wsId') || '';
  const [, papel, falha] = await entrada(req, wsId);
  if (falha) return falha;
  try {
    const chave = u.searchParams.get('xml');
    if (chave) {
      const xml = await xmlDaNota(adminDb, wsId, chave);
      return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Content-Disposition': `attachment; filename="NFSe-${chave.replace(/\D/g, '')}.xml"`, 'Cache-Control': 'no-store' } });
    }
    if (u.searchParams.get('lista')) return NextResponse.json({ notas: await listar(adminDb, wsId) });
    const r = resumo(await carregar(adminDb, wsId));
    return NextResponse.json({ ...r, papel });
  } catch (e) { return erro(e, 'GET'); }
}

// POST { acao: 'certificado', wsId, arquivo (base64 do .pfx), senha }
//      { acao: 'removerCertificado', wsId }
//      { acao: 'config', wsId, config }
//      { acao: 'testar', wsId }
//      { acao: 'emitir', wsId, nota }
//      { acao: 'cancelar', wsId, chave, motivo, justificativa }
export async function POST(req) {
  let b = {};
  try { b = await req.json(); } catch { /* corpo vazio */ }
  const wsId = String(b.wsId || '');
  const soDono = ['certificado', 'removerCertificado', 'config', 'testar'].includes(b.acao);
  const [user, , falha] = await entrada(req, wsId, { soDono });
  if (falha) return falha;
  try {
    if (b.acao === 'certificado') {
      if (limiteExcedido('nfse-cert:' + user.uid, 10)) return NextResponse.json({ error: 'Muitas tentativas. Tente de novo em 1 hora.' }, { status: 429 });
      const pfx = Buffer.from(String(b.arquivo || ''), 'base64');
      return NextResponse.json({ ok: true, ...(await salvarCertificado(adminDb, wsId, user.uid, pfx, b.senha)) });
    }
    if (b.acao === 'removerCertificado') return NextResponse.json({ ok: true, ...(await removerCertificado(adminDb, wsId)) });
    if (b.acao === 'config') return NextResponse.json({ ok: true, ...(await salvarConfig(adminDb, wsId, user.uid, b.config || {})) });

    if (!(await planoPermite(wsId))) return NextResponse.json({ error: 'A emissão de notas fiscais faz parte do plano Intermediário em diante.', plano: true }, { status: 402 });
    if (b.acao === 'testar') {
      if (limiteExcedido('nfse-teste:' + user.uid, 20)) return NextResponse.json({ error: 'Muitos testes em pouco tempo. Tente de novo mais tarde.' }, { status: 429 });
      return NextResponse.json(await testarConexao(adminDb, wsId));
    }
    if (b.acao === 'emitir') {
      if (limiteExcedido('nfse-emitir:' + wsId, 300)) return NextResponse.json({ error: 'Muitas notas em pouco tempo. Tente de novo mais tarde.' }, { status: 429 });
      const r = await emitir(adminDb, wsId, b.nota || {}, { usuario: user.email || user.uid });
      return NextResponse.json({ ok: true, ...r, consulta: consultaPublica(r.chave) });
    }
    if (b.acao === 'cancelar') {
      if (limiteExcedido('nfse-cancelar:' + wsId, 60)) return NextResponse.json({ error: 'Muitos cancelamentos em pouco tempo. Tente de novo mais tarde.' }, { status: 429 });
      return NextResponse.json(await cancelar(adminDb, wsId, String(b.chave || ''), b.motivo, b.justificativa, { usuario: user.email || user.uid }));
    }
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (e) { return erro(e, b.acao); }
}
