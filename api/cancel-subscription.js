// Stripe Subscription Cancellation API for PostDoseRX
// Handles both trial and premium subscription cancellations

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
    const { email, reason = 'customer_requested' } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    console.log('Processing cancellation request for:', email);

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

    // Get active and trialing subscriptions for this customer
    const activeSubscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all', // Get all statuses, then filter
      limit: 10
    });

    // Filter for active or trialing subscriptions
    const validSubscriptions = activeSubscriptions.data.filter(sub => 
      sub.status === 'active' || sub.status === 'trialing'
    );

    // If no valid (active/trialing) subscriptions, check for recently canceled ones
    if (validSubscriptions.length === 0) {
      const recentSubscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'canceled',
        limit: 5
      });

      // Check if they have a recently canceled subscription (within last 24 hours)
      const recentlyCanceled = recentSubscriptions.data.find(sub => {
        const canceledAt = new Date(sub.canceled_at * 1000);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return canceledAt > oneDayAgo;
      });

      if (recentlyCanceled) {
        const canceledAt = new Date(recentlyCanceled.canceled_at * 1000);
        const isTrialSubscription = recentlyCanceled.trial_end && recentlyCanceled.trial_end > Math.floor(Date.now() / 1000);
        const trialEndDate = isTrialSubscription ? new Date(recentlyCanceled.trial_end * 1000) : null;
        
        return res.status(200).json({ 
          success: true,
          alreadyCanceled: true,
          message: isTrialSubscription 
            ? `✅ Your 7-day trial was already canceled on ${canceledAt.toLocaleDateString()}. You have FULL ACCESS until your trial expires on ${trialEndDate.toLocaleDateString()}. You will NOT be charged.`
            : `✅ Your Premium subscription was already canceled on ${canceledAt.toLocaleDateString()}. You have access until your billing period ends. No future payments will be charged.`,
          canceledAt: canceledAt.toISOString(),
          subscriptionId: recentlyCanceled.id,
          accessUntil: isTrialSubscription ? trialEndDate.toISOString() : new Date(recentlyCanceled.current_period_end * 1000).toISOString()
        });
      }

      return res.status(404).json({ 
        error: 'No active subscriptions found',
        message: 'No active subscription found to cancel. If you believe this is an error, please contact support.'
      });
    }

    // Use the valid subscriptions we found
    const subscriptions = { data: validSubscriptions };

    const subscription = subscriptions.data[0]; // Get the first active subscription
    console.log('Found subscription:', subscription.id, 'Status:', subscription.status);

    // Check if it's a trial subscription
    const isTrialSubscription = subscription.trial_end && subscription.trial_end > Math.floor(Date.now() / 1000);
    const trialEndDate = isTrialSubscription ? new Date(subscription.trial_end * 1000) : null;

    console.log('Is trial:', isTrialSubscription, 'Trial end:', trialEndDate);

    // Cancel the subscription immediately to prevent future billing
    const canceledSubscription = await stripe.subscriptions.cancel(subscription.id, {
      prorate: false, // Don't prorate since we want to prevent billing entirely
    });

    console.log('Subscription canceled:', canceledSubscription.id);

    // Prepare response based on subscription type
    let message, summary;

    if (isTrialSubscription) {
      message = `✅ TRIAL SUBSCRIPTION SUCCESSFULLY CANCELED\n\n🔒 You will NOT be charged when your trial ends\n📅 You have FULL ACCESS until: ${trialEndDate.toLocaleDateString()}\n💡 Continue using all features until your trial expires on ${trialEndDate.toLocaleDateString()}`;
      summary = {
        type: 'trial_canceled',
        trialEndDate: trialEndDate.toISOString(),
        willBeBilled: false,
        accessUntil: trialEndDate.toLocaleDateString(),
        future_payments_stopped: true,
        access_continues_until: trialEndDate.toISOString(),
        important_note: `Full access continues until ${trialEndDate.toLocaleDateString()}`
      };
    } else {
      const periodEnd = new Date(canceledSubscription.current_period_end * 1000);
      message = `✅ PREMIUM SUBSCRIPTION SUCCESSFULLY CANCELED\n\n🔒 No future payments will be charged\n📅 You have FULL ACCESS until: ${periodEnd.toLocaleDateString()}\n💡 Continue using all premium features until your billing period ends`;
      summary = {
        type: 'premium_canceled',
        accessUntil: periodEnd.toLocaleDateString(),
        periodEnd: periodEnd.toISOString(),
        willBeBilled: false,
        future_payments_stopped: true,
        access_continues_until: periodEnd.toISOString(),
        important_note: `Premium access continues until ${periodEnd.toLocaleDateString()}`
      };
    }

    return res.status(200).json({
      success: true,
      message: message,
      summary: summary,
      subscriptionId: canceledSubscription.id,
      customerId: customer.id
    });

  } catch (error) {
    console.error('Subscription cancellation error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel subscription',
      message: 'Unable to process cancellation request. Please contact support for assistance.'
    });
  }
}