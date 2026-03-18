// Stripe Downgrade Scheduling API for PostDoseRX
// Schedules subscription downgrades at end of billing cycle

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
    const { email, downgrade_type = 'premium_to_trial' } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    console.log('Processing downgrade request for:', email);

    // Find customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (customers.data.length === 0) {
      return res.status(404).json({ 
        error: 'No Stripe customer found for this email',
        message: 'Unable to find your subscription. Please contact support.'
      });
    }

    const customer = customers.data[0];
    console.log('Found customer:', customer.id);

    // Get active premium subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10
    });

    const premiumSubscription = subscriptions.data.find(sub =>
      sub.items.data.some(item =>
        item.price.id === process.env.STRIPE_PREMIUM_PRICE_ID
      )
    );

    if (!premiumSubscription) {
      return res.status(404).json({ 
        error: 'No active premium subscription found',
        message: 'You don\'t have an active Premium subscription to downgrade.'
      });
    }

    console.log('Found premium subscription:', premiumSubscription.id);

    // Schedule downgrade by canceling at period end
    const updatedSubscription = await stripe.subscriptions.update(
      premiumSubscription.id,
      {
        cancel_at_period_end: true,
        metadata: {
          ...premiumSubscription.metadata,
          downgrade_scheduled: 'true',
          downgrade_type: downgrade_type,
          downgrade_requested_at: new Date().toISOString(),
          new_plan: 'trial'
        }
      }
    );

    console.log('Downgrade scheduled for subscription:', updatedSubscription.id);

    // Calculate access until date
    const periodEnd = new Date(updatedSubscription.current_period_end * 1000);
    const accessUntilDate = periodEnd.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });

    return res.status(200).json({
      success: true,
      message: `Downgrade scheduled successfully. You'll continue to have premium access until ${accessUntilDate}.`,
      subscriptionId: updatedSubscription.id,
      customerId: customer.id,
      accessUntil: accessUntilDate,
      periodEndTimestamp: updatedSubscription.current_period_end,
      downgradeType: downgrade_type,
      scheduledAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Downgrade scheduling error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to schedule downgrade',
      message: 'Unable to process downgrade request. Please contact support for assistance.'
    });
  }
}