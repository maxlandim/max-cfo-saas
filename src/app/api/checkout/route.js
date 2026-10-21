import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminConfigurado, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { PLANOS } from '../../../lib/plans';

export const dynamic = 'force-dynamic';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null;

export async function POST(req) {
  if (!stripe || !adminConfigurado) {
    return NextResponse.json({ error: 'Os pagamentos ainda não estão configurados. Fale com o suporte.' }, { status: 503 });
  }

  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ error: 'Faça login para assinar.' }, { status: 401 });

  let body = {};
  try { body = await req.json(); } catch {}
  const planId = PLANOS[body.planId] ? body.planId : 'basic';
  const plano = PLANOS[planId];

  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get('origin') || `https://${req.headers.get('host')}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: { name: plano.nome, images: [`${origin}/icon-512.png`] },
            unit_amount: plano.valor,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      client_reference_id: user.uid,
      customer_email: user.email || undefined,
      metadata: { uid: user.uid, planId },
      subscription_data: { metadata: { uid: user.uid, planId } },
      allow_promotion_codes: true,
      locale: 'pt-BR',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Erro no checkout do Stripe:', err);
    return NextResponse.json({ error: 'Não foi possível abrir o pagamento agora. Tente de novo em instantes.' }, { status: 500 });
  }
}
