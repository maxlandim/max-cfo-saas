import { NextResponse } from 'next/server';
import { adminConfigurado, adminDb, usuarioDaRequisicao } from '../../../../lib/firebaseAdmin';
import { donoDoEspaco } from '../../../../lib/asaasCliente';

export const dynamic = 'force-dynamic';

async function entrada(req, wsId) {
  if (!adminConfigurado) return NextResponse.json({ error: 'Servidor sem configuração.' }, { status: 503 });
  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });
  if (!donoDoEspaco(user.uid, wsId)) return NextResponse.json({ error: 'Sem acesso a esta empresa.' }, { status: 403 });
  return null;
}

// GET ?wsId=: pagamentos e mudanças de cobrança que o painel ainda não aplicou
export async function GET(req) {
  const wsId = new URL(req.url).searchParams.get('wsId') || '';
  const erro = await entrada(req, wsId);
  if (erro) return erro;
  const snap = await adminDb.collection('cobrancaEventos').doc(wsId).collection('itens').limit(200).get();
  return NextResponse.json({ eventos: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
}

// POST { wsId, ids }: o painel aplicou esses eventos (pode apagar)
export async function POST(req) {
  let b = {};
  try { b = await req.json(); } catch {}
  const wsId = String(b.wsId || '');
  const erro = await entrada(req, wsId);
  if (erro) return erro;
  const ids = (Array.isArray(b.ids) ? b.ids : []).slice(0, 200).map(String);
  const lote = adminDb.batch();
  ids.forEach((id) => lote.delete(adminDb.collection('cobrancaEventos').doc(wsId).collection('itens').doc(id)));
  await lote.commit();
  return NextResponse.json({ ok: true, apagados: ids.length });
}
