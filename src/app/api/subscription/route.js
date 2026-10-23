import { NextResponse } from 'next/server';
import { adminConfigurado, adminDb, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { statusDoUsuario, sincronizarAssinatura } from '../../../lib/assinatura';
import { asaasConfigurado } from '../../../lib/asaas';

export const dynamic = 'force-dynamic';

// GET: diz se o usuário logado pode usar o painel (assinatura em dia, teste grátis ou admin).
export async function GET(req) {
  if (!adminConfigurado) {
    // Antes de configurar FIREBASE_SERVICE_ACCOUNT o acesso fica liberado, com aviso no painel.
    return NextResponse.json({ acesso: true, motivo: 'configuracao_pendente' });
  }
  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });
  try {
    return NextResponse.json(await statusDoUsuario(user));
  } catch (e) {
    console.error('Erro ao consultar assinatura:', e);
    return NextResponse.json({ error: 'Não foi possível verificar a assinatura agora.' }, { status: 500 });
  }
}

// POST: logo depois do checkout, confere no Asaas se a assinatura já foi criada (sem esperar o webhook).
export async function POST(req) {
  if (!adminConfigurado || !asaasConfigurado()) return NextResponse.json({ error: 'Pagamentos ainda não configurados.' }, { status: 503 });
  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });
  try {
    const sub = (await adminDb.collection('subscriptions').doc(user.uid).get()).data() || {};
    if (sub.asaasCustomerId) await sincronizarAssinatura(user.uid, sub.asaasCustomerId);
    return NextResponse.json(await statusDoUsuario(user));
  } catch (e) {
    console.error('Erro ao confirmar assinatura:', e.message);
    return NextResponse.json({ error: 'Não foi possível confirmar agora.' }, { status: 500 });
  }
}
