export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    // Parsuj body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers });
    }

    const { plan } = body;

    // Mapowanie planów na Price IDs ze zmiennych środowiskowych
    const PRICES = {
      basic: env.STRIPE_PRICE_BASIC,
      monthly: env.STRIPE_PRICE_MONTHLY,
      annual: env.STRIPE_PRICE_ANNUAL,
    };

    const priceId = PRICES[plan];

    if (!priceId) {
      return new Response(JSON.stringify({ error: `Unknown plan: ${plan}` }), { status: 400, headers });
    }

    if (!env.STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Stripe key not configured' }), { status: 500, headers });
    }

    const origin = new URL(request.url).origin;

    // Buduj parametry dla Stripe REST API
    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('payment_method_types[]', 'card');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', `${origin}/?payment=success`);
    params.append('cancel_url', `${origin}/`);
    params.append('locale', 'pl');
    params.append('allow_promotion_codes', 'true');

    // Wywołaj Stripe API
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2023-10-16',
      },
      body: params.toString(),
    });

    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error('Stripe error:', JSON.stringify(session));
      return new Response(JSON.stringify({ error: session.error?.message || 'Stripe error' }), { status: 500, headers });
    }

    if (!session.url) {
      return new Response(JSON.stringify({ error: 'No checkout URL returned' }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers });

  } catch (err) {
    console.error('Function error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

// Obsługa preflight CORS
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}