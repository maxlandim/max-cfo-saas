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
  const abrir = (configuration) => stripe.billingPortal.sessions.create({ customer, return_url: `${origin}/dashboard`, locale: 'pt-BR', ...(configuration ? { configuration } : {}) });
  try {
    let session;
    try { session = await abrir(); }
    catch (e) {
      // Conta sem portal configurado no painel do Stripe: cria a configuração uma vez (trocar cartão, ver faturas, cancelar)
      if (!/configuration/i.test(String(e && e.message))) throw e;
      const existentes = await stripe.billingPortal.configurations.list({ active: true, limit: 1 });
      const conf = existentes.data[0] || await stripe.billingPortal.configurations.create({
        business_profile: { headline: 'Landim Advisory: gerencie sua assinatura', privacy_policy_url: `${origin}/privacidade`, terms_of_service_url: `${origin}/termos` },
        features: {
          payment_method_update: { enabled: true },
          invoice_history: { enabled: true },
          customer_update: { enabled: true, allowed_updates: ['email', 'name', 'tax_id', 'address'] },
          subscription_cancel: { enabled: true, mode: 'at_period_end', cancellation_reason: { enabled: true, options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'] } },
        },
        default_return_url: `${origin}/dashboard`,
      });
      session = await abrir(conf.id);
    }
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('Erro ao abrir o portal do Stripe:', e);
    return NextResponse.json({ error: 'Não foi possível abrir o portal agora. Ative o portal do cliente no Stripe.' }, { status: 500 });
  }
}
