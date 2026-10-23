import { NextResponse } from 'next/server';
import { adminConfigurado, adminDb, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { meuCodigo, vincularIndicacao } from '../../../lib/indicacao';

export const dynamic = 'force-dynamic';

const site = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://landimadvisory.com.br').replace(/\/$/, '');

// GET: código e números de indicação da conta logada
export async function GET(req) {
  if (!adminConfigurado) return NextResponse.json({ error: 'Servidor sem configuração.' }, { status: 503 });
  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });
  try {
    const d = await meuCodigo(user.uid);
    const sub = (await adminDb.collection('subscriptions').doc(user.uid).get()).data() || {};
    return NextResponse.json({ codigo: d.codigo, link: `${site()}/?ref=${d.codigo}`, indicados: d.indicados || 0, pagos: d.pagos || 0, mesesGanhos: sub.mesesGanhos || 0, mesesGuardados: sub.mesesGratis || 0 });
  } catch (e) {
    console.error('Indicação:', e.message);
    return NextResponse.json({ error: 'Não consegui carregar a indicação agora.' }, { status: 500 });
  }
}

// POST { codigo }: liga a conta recém-criada a quem indicou
export async function POST(req) {
  if (!adminConfigurado) return NextResponse.json({ error: 'Servidor sem configuração.' }, { status: 503 });
  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  try {
    return NextResponse.json(await vincularIndicacao(user.uid, String(body.codigo || '').toUpperCase()));
  } catch (e) {
    console.error('Vincular indicação:', e.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
