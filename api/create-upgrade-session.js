// Stripe Upgrade Session API for PostDoseRX
// Creates upgrade checkout sessions with prorated billing

const stripe = require('stripe')(
  process.env.STRIPE_SECRET_KEY || 
  process.env.API_SECRET_KEY || 
  process.env.STRIPE_PRIVATE_KEY ||
  process.env.STRIPE_SECRET
);

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, upgrade_type = 'trial_to_premium' } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    console.log('Creating upgrade session for:', email);

    // Find customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    let customer;
    if (customers.data.length === 0) {
      // Create new customer if none exists
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          upgrade_from: 'trial'
        }
      });
      console.log('Created new customer:', customer.id);
    } else {
      customer = customers.data[0];
      console.log('Found existing customer:', customer.id);
    }

    // Check for existing active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10
    });

    // If user has active premium subscription, they can't upgrade
    const hasActivePremium = subscriptions.data.some(sub => 
      sub.items.data.some(item => 
        item.price.id === process.env.STRIPE_PREMIUM_PRICE_ID
      )
    );

    if (hasActivePremium) {
      return res.status(400).json({
        error: 'You already have an active Premium subscription',
        message: 'You are already subscribed to Premium. No upgrade needed.'
      });
    }

    // Create checkout session for upgrade
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium_monthly',
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `https://postdoserx.com/success.html?upgrade=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: 'https://app.postdoserx.com',
      subscription_data: {
        metadata: {
          upgrade_type: upgrade_type,
          original_plan: 'trial',
          upgraded_at: new Date().toISOString()
        }
      },
      metadata: {
        upgrade_type: upgrade_type,
        customer_email: email
      },
      // Enable proration for immediate billing adjustment
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
        },
      },
      billing_address_collection: 'auto',
      customer_update: {
        address: 'auto',
        name: 'auto'
      }
    });

    console.log('Upgrade checkout session created:', checkoutSession.id);

    return res.status(200).json({
      success: true,
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
      customerId: customer.id,
      upgrade_type: upgrade_type
    });

  } catch (error) {
    console.error('Upgrade session creation error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create upgrade session',
      message: 'Unable to process upgrade request. Please contact support for assistance.'
    });
  }
}