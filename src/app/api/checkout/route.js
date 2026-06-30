import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Configura o stripe apenas se a chave estiver definida no env
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

export async function POST(req) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe API keys missing' }, { status: 500 });
    }

    // Tentar ler os dados enviados
    let body = {};
    try {
      body = await req.json();
    } catch(e) {}
    
    const { email, planId } = body;

    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = req.headers.get('host') || 'localhost:3000';
    const origin = `${protocol}://${host}`;

    const plans = {
      basic: {
        price_data: { currency: 'brl', product_data: { name: 'MAX CFO AI - Básico', images: [`${origin}/icon-512.png`] }, unit_amount: 4990, recurring: { interval: 'month' } },
      },
      intermediate: {
        price_data: { currency: 'brl', product_data: { name: 'MAX CFO AI - Intermediário', images: [`${origin}/icon-512.png`] }, unit_amount: 12990, recurring: { interval: 'month' } },
      },
      complete: {
        price_data: { currency: 'brl', product_data: { name: 'MAX CFO AI - Completo', images: [`${origin}/icon-512.png`] }, unit_amount: 26990, recurring: { interval: 'month' } },
      },
      unlimited: {
        price_data: { currency: 'brl', product_data: { name: 'MAX CFO AI - Unlimited', images: [`${origin}/icon-512.png`] }, unit_amount: 29990, recurring: { interval: 'month' } },
      }
    };

    const selectedPlan = plans[planId] || plans['basic'];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: selectedPlan.price_data,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 7, // 7 dias grátis para qualquer plano
      },
      customer_email: email,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe Checkout Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
