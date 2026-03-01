import Stripe from 'stripe';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { plan, successUrl, cancelUrl } = await request.json();

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    const PRICES = {
      basic: env.STRIPE_PRICE_BASIC,
      monthly: env.STRIPE_PRICE_MONTHLY,
      annual: env.STRIPE_PRICE_ANNUAL,
    };

    const priceId = PRICES[plan];
    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${new URL(request.url).origin}/?payment=success`,
      cancel_url: cancelUrl || `${new URL(request.url).origin}/`,
      locale: 'pl',
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Stripe error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
