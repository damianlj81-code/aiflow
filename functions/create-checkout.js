export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { plan, successUrl, cancelUrl } = await request.json();

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

    const origin = new URL(request.url).origin;

    const body = new URLSearchParams({
      mode: 'subscription',
      'payment_method_types[]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: successUrl || `${origin}/?payment=success`,
      cancel_url: cancelUrl || `${origin}/`,
      locale: 'pl',
      allow_promotion_codes: 'true',
    });

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const session = await response.json();

    if (session.url) {
      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: session.error?.message || 'Unknown error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}