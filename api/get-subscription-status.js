// Stripe Subscription Status API for PostDoseRX
// Returns detailed subscription information for dashboard display

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
    const { email } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    console.log('Getting subscription status for:', email);

    // Find customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (customers.data.length === 0) {
      // User has no Stripe customer - they're likely new and should see trial signup
      return res.status(200).json({ 
        hasSubscription: false,
        tier: 'none',
        message: 'No subscription found - ready for trial signup',
        subscriptionData: null
      });
    }

    const customer = customers.data[0];
    console.log('Found customer:', customer.id);

    // Get all subscriptions for this customer (active, trialing, past_due)
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 10
    });

    // Find the most relevant subscription (active, trialing, or recently canceled)
    let activeSubscription = null;
    let subscriptionStatus = 'none';

    // Priority order: active, trialing, past_due, then recently canceled
    const validStatuses = ['active', 'trialing', 'past_due'];
    for (const status of validStatuses) {
      activeSubscription = subscriptions.data.find(sub => sub.status === status);
      if (activeSubscription) {
        subscriptionStatus = status;
        break;
      }
    }

    // If no active/trialing subscription, check for recently canceled (within 30 days)
    if (!activeSubscription) {
      const recentlyCanceled = subscriptions.data
        .filter(sub => sub.status === 'canceled')
        .find(sub => {
          const canceledAt = new Date(sub.canceled_at * 1000);
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return canceledAt > thirtyDaysAgo;
        });

      if (recentlyCanceled) {
        activeSubscription = recentlyCanceled;
        subscriptionStatus = 'canceled';
      }
    }

    if (!activeSubscription) {
      return res.status(200).json({ 
        hasSubscription: false,
        tier: 'expired',
        message: 'No active subscription found',
        subscriptionData: null
      });
    }

    // Determine subscription details
    const now = Date.now() / 1000;
    const isTrialSubscription = activeSubscription.trial_end && activeSubscription.trial_end > now;
    const trialEndDate = activeSubscription.trial_end ? new Date(activeSubscription.trial_end * 1000) : null;
    const currentPeriodEnd = new Date(activeSubscription.current_period_end * 1000);

    // Get pricing information
    const price = activeSubscription.items.data[0]?.price;
    const priceAmount = price ? price.unit_amount / 100 : 0;
    const priceCurrency = price ? price.currency.toUpperCase() : 'USD';
    const interval = price ? price.recurring?.interval : 'month';

    let tier, displayPrice, nextBillingText, accessUntil;

    if (subscriptionStatus === 'canceled') {
      tier = 'canceled';
      displayPrice = 'Canceled';
      if (isTrialSubscription && trialEndDate) {
        nextBillingText = `Access until: ${trialEndDate.toLocaleDateString()}`;
        accessUntil = trialEndDate.toISOString();
      } else {
        nextBillingText = `Access until: ${currentPeriodEnd.toLocaleDateString()}`;
        accessUntil = currentPeriodEnd.toISOString();
      }
    } else if (isTrialSubscription) {
      tier = 'trial';
      displayPrice = 'Free for 7 days';
      const daysLeft = Math.ceil((activeSubscription.trial_end * 1000 - Date.now()) / (24 * 60 * 60 * 1000));
      nextBillingText = `Trial expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} (${trialEndDate.toLocaleDateString()})`;
      accessUntil = trialEndDate.toISOString();
    } else {
      tier = 'premium';
      displayPrice = `$${priceAmount}/${interval}`;
      nextBillingText = `Next billing: ${currentPeriodEnd.toLocaleDateString()}`;
      accessUntil = currentPeriodEnd.toISOString();
    }

    // Additional status handling
    if (subscriptionStatus === 'past_due') {
      nextBillingText = `⚠️ Payment overdue - ${nextBillingText}`;
    }

    const subscriptionData = {
      id: activeSubscription.id,
      customerId: customer.id,
      status: subscriptionStatus,
      tier: tier,
      displayPrice: displayPrice,
      nextBillingText: nextBillingText,
      accessUntil: accessUntil,
      isTrialSubscription: isTrialSubscription,
      trialEnd: trialEndDate ? trialEndDate.toISOString() : null,
      currentPeriodEnd: currentPeriodEnd.toISOString(),
      priceAmount: priceAmount,
      interval: interval,
      currency: priceCurrency
    };

    console.log('Subscription data:', subscriptionData);

    return res.status(200).json({
      hasSubscription: true,
      tier: tier,
      subscriptionData: subscriptionData,
      message: `${tier} subscription found`
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    
    return res.status(500).json({
      hasSubscription: false,
      tier: 'error',
      error: error.message || 'Failed to get subscription status',
      message: 'Unable to check subscription status. Please contact support.',
      subscriptionData: null
    });
  }
}