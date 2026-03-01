export async function onRequest(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const { plan } = await request.json();

    const PRICES = {
      basic: env.STRIPE_PRICE_BASIC,
      monthly: env.STRIPE_PRICE_MONTHLY,
      annual: env.STRIPE_PRICE_ANNUAL,
    };

    const priceId = PRICES[plan];
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Unknown plan: ${plan}` }), { status: 400, headers });
    }

    const origin = new URL(request.url).origin;
    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('payment_method_types[]', 'card');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', `${origin}/?payment=success`);
    params.append('cancel_url', `${origin}/`);
    params.append('locale', 'pl');
    params.append('allow_promotion_codes', 'true');

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      return new Response(JSON.stringify({ error: session.error?.message || 'Stripe error' }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}