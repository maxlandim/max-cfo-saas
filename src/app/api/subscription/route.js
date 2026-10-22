import { NextResponse } from 'next/server';
import { adminConfigurado, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { statusDoUsuario, gravarAssinatura, creditarAvulso } from '../../../lib/assinatura';

export const dynamic = 'force-dynamic';

// O Stripe só é carregado na confirmação do pagamento, para a verificação de acesso (GET) responder mais rápido
let stripe = null;
async function pegarStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripe) { const { default: Stripe } = await import('stripe'); stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }); }
  return stripe;
}

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
  const stripe = await pegarStripe();
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
    if (session.metadata?.tipo === 'avulso' && session.payment_status === 'paid') await creditarAvulso(session);
    return NextResponse.json({ ...(await statusDoUsuario(user)), pagamento: session.metadata?.tipo === 'avulso' ? (session.payment_status === 'paid' ? 'avulso_pago' : 'avulso_pendente') : 'cartao' });
  } catch (e) {
    console.error('Erro ao confirmar checkout:', e);
    return NextResponse.json({ error: 'Não foi possível confirmar o pagamento agora.' }, { status: 500 });
  }
}
