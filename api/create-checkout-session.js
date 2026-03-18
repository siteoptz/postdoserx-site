// Stripe Checkout Session API for PostDoseRX
// Creates trial subscriptions with 7-day trial period

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
    const { priceId, email, name, tier = 'premium' } = req.body;

    // Validate required fields
    if (!priceId || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields: priceId and email are required' 
      });
    }

    // Determine trial period based on price ID
    let trialPeriodDays = 0;
    let sessionConfig = {
      mode: 'subscription',
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: `https://app.postdoserx.com?checkout=success&tier=${tier || 'premium'}`,
      cancel_url: `https://app.postdoserx.com?checkout=cancelled`,
      customer_email: email,
      metadata: {
        customer_name: name || '',
        tier: tier,
        source: 'postdoserx_signup'
      }
    };

    // Configure pricing based on tier
    if (tier === 'trial') {
      // Trial customers: 7-day trial, then $9.99/month
      trialPeriodDays = 7;
      sessionConfig.subscription_data = {
        trial_period_days: trialPeriodDays,
        metadata: {
          tier: 'trial',
          trial: 'true',
          original_signup_date: new Date().toISOString()
        }
      };
      // Update success URL for trial customers with tier parameter
      sessionConfig.success_url = `https://app.postdoserx.com?checkout=success&tier=trial`;
      sessionConfig.cancel_url = `https://app.postdoserx.com?checkout=cancelled`;
    } else if (tier === 'premium') {
      // Premium customers: immediate $12.99/month payment
      // No trial period for premium (they pay immediately)
      sessionConfig.subscription_data = {
        metadata: {
          tier: 'premium',
          trial: 'false',
          original_signup_date: new Date().toISOString()
        }
      };
      // Update success URL for premium customers with tier parameter
      sessionConfig.success_url = `https://app.postdoserx.com?checkout=success&tier=premium`;
      sessionConfig.cancel_url = `https://app.postdoserx.com?checkout=cancelled`;
    }

    console.log('Creating checkout session:', {
      priceId,
      email,
      name,
      tier,
      trialPeriodDays
    });
    
    // Debug environment variables
    const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.API_SECRET_KEY || process.env.STRIPE_PRIVATE_KEY || process.env.STRIPE_SECRET;
    console.log('Using Stripe key:', stripeKey ? stripeKey.substring(0, 10) + '...' : 'NOT FOUND');

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('Checkout session created:', session.id);

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
      trialPeriodDays: trialPeriodDays
    });

  } catch (error) {
    console.error('Stripe checkout session error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create checkout session',
      fallback: 'Please try again or contact support'
    });
  }
}