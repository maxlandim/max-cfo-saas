import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminConfigurado, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { statusDoUsuario, gravarAssinatura } from '../../../lib/assinatura';

export const dynamic = 'force-dynamic';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null;

// GET: diz se o usuário logado pode usar o painel (assinatura ativa, teste grátis ou admin).
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

// POST { sessionId }: confirma o pagamento logo após o checkout, sem esperar o webhook.
export async function POST(req) {
  if (!adminConfigurado || !stripe) return NextResponse.json({ error: 'Pagamentos ainda não configurados.' }, { status: 503 });
  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });

  let body = {};
  try { body = await req.json(); } catch {}
  if (!body.sessionId) return NextResponse.json({ error: 'Sessão de pagamento não informada.' }, { status: 400 });

  try {
    const session = await stripe.checkout.sessions.retrieve(body.sessionId, { expand: ['subscription'] });
    if (session.client_reference_id !== user.uid) {
      return NextResponse.json({ error: 'Este pagamento pertence a outra conta.' }, { status: 403 });
    }
    if (session.subscription && typeof session.subscription === 'object') {
      await gravarAssinatura(user.uid, session.subscription, { plan: session.metadata?.planId || null });
    }
    return NextResponse.json(await statusDoUsuario(user));
  } catch (e) {
    console.error('Erro ao confirmar checkout:', e);
    return NextResponse.json({ error: 'Não foi possível confirmar o pagamento agora.' }, { status: 500 });
  }
}
