import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminConfigurado, adminAuth, adminDb, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { PLANOS, DIAS_DE_TESTE, FUNDADOR, MESES_PAGOS_NO_ANUAL } from '../../../lib/plans';
import { vagasFundador } from '../../../lib/fundadores';

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
  const anual = body.periodo === 'anual';
  const meses = anual ? MESES_PAGOS_NO_ANUAL : 1;

  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get('origin') || `https://${req.headers.get('host')}`;

  // Quem assina durante o teste grátis não perde os dias que faltam: o cartão é cadastrado agora
  // e a primeira cobrança acontece quando o teste acaba (só na primeira assinatura da conta).
  // O Stripe exige pelo menos 48 horas de teste; com menos que isso, cobra na hora.
  let fimTeste = null;
  try {
    const snap = await adminDb.collection('subscriptions').doc(user.uid).get();
    if (!(snap.exists && snap.data().stripeSubscriptionId)) {
      const conta = await adminAuth.getUser(user.uid);
      const fim = new Date(conta.metadata.creationTime).getTime() + DIAS_DE_TESTE * 864e5;
      if (fim - Date.now() > 49 * 3600 * 1000) fimTeste = fim;
    }
  } catch (e) { console.warn('Não consegui calcular o fim do teste:', e.message); }
  const dataBR = (ms) => new Date(ms).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  // Preço de fundador: enquanto houver vaga, um cupom do Stripe tira a diferença por FUNDADOR.meses
  let cupom = null;
  try {
    if ((await vagasFundador({ semCache: true })) > 0 && plano.fundador < plano.valor) {
      const id = `fundador-${planId}-${anual ? 'anual' : 'mensal'}-v1`;
      cupom = await stripe.coupons.retrieve(id).catch(() => null);
      if (!cupom) {
        cupom = await stripe.coupons.create({
          id, name: `Preço de fundador (${FUNDADOR.meses} meses)`, currency: 'brl',
          amount_off: (plano.valor - plano.fundador) * meses, duration: 'repeating', duration_in_months: FUNDADOR.meses,
        });
      }
    }
  } catch (e) { console.warn('Cupom de fundador:', e.message); cupom = null; }
  const meta = { uid: user.uid, planId, periodo: anual ? 'anual' : 'mensal', ...(cupom ? { fundador: '1' } : {}) };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: { name: plano.nome + (anual ? ' (anual)' : ''), images: [`${origin}/icon-512.png`] },
            unit_amount: plano.valor * meses,
            recurring: { interval: anual ? 'year' : 'month' },
          },
          quantity: 1,
        },
      ],
      client_reference_id: user.uid,
      customer_email: user.email || undefined,
      metadata: meta,
      subscription_data: { metadata: meta, ...(fimTeste ? { trial_end: Math.floor(fimTeste / 1000) } : {}) },
      payment_method_collection: 'always',
      ...(fimTeste ? { custom_text: { submit: { message: `Você continua no teste grátis. A primeira cobrança será em ${dataBR(fimTeste)}, e você pode cancelar antes sem pagar nada.` } } } : {}),
      // o Stripe não aceita cupom automático junto com o campo de código promocional
      ...(cupom ? { discounts: [{ coupon: cupom.id }] } : { allow_promotion_codes: true }),
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
