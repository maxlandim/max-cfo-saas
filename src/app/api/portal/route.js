import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminConfigurado, adminDb, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null;

// Abre o portal do Stripe para o cliente trocar o cartão, mudar de plano ou cancelar.
export async function POST(req) {
  if (!stripe || !adminConfigurado) return NextResponse.json({ error: 'Pagamentos ainda não configurados.' }, { status: 503 });
  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });

  const snap = await adminDb.collection('subscriptions').doc(user.uid).get();
  const customer = snap.exists ? snap.data().stripeCustomerId : null;
  if (!customer) return NextResponse.json({ error: 'Nenhuma assinatura encontrada nesta conta.' }, { status: 404 });

  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get('origin') || `https://${req.headers.get('host')}`;
  try {
    const session = await stripe.billingPortal.sessions.create({ customer, return_url: `${origin}/dashboard`, locale: 'pt-BR' });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('Erro ao abrir o portal do Stripe:', e);
    return NextResponse.json({ error: 'Não foi possível abrir o portal agora. Ative o portal do cliente no Stripe.' }, { status: 500 });
  }
}
