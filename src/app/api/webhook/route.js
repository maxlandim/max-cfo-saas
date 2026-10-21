import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminConfigurado } from '../../../lib/firebaseAdmin';
import { gravarAssinatura } from '../../../lib/assinatura';

export const dynamic = 'force-dynamic';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null;
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Recebe os avisos do Stripe e mantém subscriptions/{uid} atualizado.
export async function POST(req) {
  if (!stripe || !endpointSecret || !adminConfigurado) {
    return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 503 });
  }

  let event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, req.headers.get('stripe-signature'), endpointSecret);
  } catch (err) {
    console.error('Assinatura do webhook inválida:', err.message);
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const uid = session.client_reference_id || session.metadata?.uid;
        if (uid && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await gravarAssinatura(uid, sub, { plan: session.metadata?.planId || null });
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        if (sub.metadata?.uid) await gravarAssinatura(sub.metadata.uid, sub);
        break;
      }
      case 'invoice.payment_failed':
      case 'invoice.paid': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          if (sub.metadata?.uid) await gravarAssinatura(sub.metadata.uid, sub);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error('Erro ao processar webhook:', event.type, e);
    return NextResponse.json({ error: 'Erro ao processar.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
