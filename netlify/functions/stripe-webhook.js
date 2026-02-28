const Stripe = require('stripe');
const admin = require('firebase-admin');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Firebase Admin init
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const session = stripeEvent.data.object;

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const email = session.customer_email || session.customer_details?.email;
      if (email) {
        await db.collection('subscribers').doc(email).set({
          email,
          status: 'active',
          plan: session.metadata?.plan || 'unknown',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`✅ Subscriber added: ${email}`);
      }
      break;
    }

    case 'customer.subscription.deleted':
    case 'customer.subscription.paused': {
      const customerId = session.customer;
      const snapshot = await db.collection('subscribers')
        .where('stripeCustomerId', '==', customerId).get();
      snapshot.forEach(async (doc) => {
        await doc.ref.update({
          status: 'cancelled',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`❌ Subscriber cancelled: ${doc.id}`);
      });
      break;
    }

    case 'customer.subscription.updated': {
      const customerId = session.customer;
      const status = session.status;
      const snapshot = await db.collection('subscribers')
        .where('stripeCustomerId', '==', customerId).get();
      snapshot.forEach(async (doc) => {
        await doc.ref.update({
          status: status === 'active' ? 'active' : 'inactive',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      break;
    }

    default:
      console.log(`Unhandled event: ${stripeEvent.type}`);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
