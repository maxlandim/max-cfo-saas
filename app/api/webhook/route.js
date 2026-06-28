import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

// Chave secreta de webhook do Stripe (para verificar a assinatura de segurança)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req) {
  if (!stripe) return NextResponse.json({ error: 'Stripe API keys missing' }, { status: 500 });

  const sig = req.headers.get('stripe-signature');
  let event;

  try {
    const rawBody = await req.text(); // Precisamos do raw body para verificar a assinatura
    
    // Verifica se a requisição realmente veio do Stripe
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } else {
      // Bypass para testes rápidos se você não configurou o endpointSecret
      event = JSON.parse(rawBody);
    }
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('💰 Pagamento Recebido!', session.customer_email);
      // Aqui você salvaria no banco de dados que o usuário pagou!
      // ex: await db.users.update({ email: session.customer_email, status: 'PRO' })
      break;
    case 'invoice.paid':
      const invoice = event.data.object;
      console.log('🔄 Renovação paga!', invoice.customer_email);
      break;
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      console.log('❌ Assinatura Cancelada!', subscription.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
