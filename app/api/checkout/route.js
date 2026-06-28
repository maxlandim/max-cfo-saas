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
    
    // Opcional: E-mail do usuário logado/cadastrado
    const { email } = body;

    // URL base dinâmica
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = req.headers.get('host') || 'localhost:3000';
    const origin = `${protocol}://${host}`;

    // Cria a sessão de pagamento (Assinatura mensal de R$49,00)
    // Usamos price_data para criar um preço na hora, ou você pode usar um price_id do painel do Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // 'pix' também pode ser ativado no dashboard do Stripe
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'MAX CFO AI - Acesso Mensal',
              description: 'Inteligência Financeira Completa + Exportação de Relatórios',
              images: [`${origin}/icon-512.png`],
            },
            unit_amount: 4900, // R$ 49,00 (em centavos)
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 7, // 7 dias grátis!
      },
      customer_email: email, // Pré-preenche o e-mail no checkout
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe Checkout Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
