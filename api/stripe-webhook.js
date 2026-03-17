// Stripe Webhook Handler for PostDoseRX
// Handles trial conversions, subscription events, and payment processing

const stripe = require('stripe')(
  process.env.STRIPE_SECRET_KEY || 
  process.env.API_SECRET_KEY || 
  process.env.STRIPE_PRIVATE_KEY ||
  process.env.STRIPE_SECRET
);

// Webhook endpoint secret for signature verification
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// CORS headers for webhook requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, stripe-signature',
};

// Configure Vercel to disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to read raw body
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

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

  const sig = req.headers['stripe-signature'];
  let event;
  let rawBody;

  try {
    // Get raw body for signature verification
    rawBody = await getRawBody(req);
    
    // Verify webhook signature
    if (webhookSecret && sig) {
      console.log('🔐 Verifying webhook signature...');
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      console.log('✅ Signature verification successful');
    } else {
      // For testing without webhook secret (development mode)
      console.log('⚠️ Running in development mode - no signature verification');
      console.log('Missing:', { 
        webhookSecret: !!webhookSecret, 
        signature: !!sig,
        secretLength: webhookSecret?.length || 0 
      });
      event = JSON.parse(rawBody.toString());
    }
    
    console.log('🔔 Stripe webhook received:', event.type);

    // Handle different webhook events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
        
      case 'customer.subscription.created':
        await handleTrialCreated(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handleTrialConversionPayment(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
      
      default:
        console.log(`🔔 Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true, eventType: event.type });

  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }
}

// Handle checkout completion - create trial user in GHL
async function handleCheckoutCompleted(session) {
  try {
    console.log('🛒 Checkout completed:', session.id);
    
    // Get customer and subscription details
    const customer = await stripe.customers.retrieve(session.customer);
    const customerEmail = customer.email;
    const customerName = customer.name || session.customer_details?.name;
    
    // Get subscription if it exists
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      // Check if this is a trial subscription
      const isTrial = subscription.status === 'trialing' || subscription.trial_end;
      
      console.log('📋 Checkout details:', {
        customer_email: customerEmail,
        customer_name: customerName,
        subscription_status: subscription.status,
        is_trial: isTrial,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
      });
      
      if (isTrial) {
        console.log('🆕 Creating trial user in GHL:', customerEmail);
        await createGHLTrialUser(customerEmail, customerName);
      } else {
        console.log('💎 Creating premium user in GHL:', customerEmail);
        await createGHLPremiumUser(customerEmail, customerName);
      }
    } else {
      console.log('ℹ️ No subscription found for checkout session');
    }
    
  } catch (error) {
    console.error('❌ Error handling checkout completion:', error);
  }
}

// Handle subscription creation - backup for trial creation
async function handleTrialCreated(subscription) {
  try {
    console.log('📝 Subscription created:', subscription.id);
    
    const customer = await stripe.customers.retrieve(subscription.customer);
    const customerEmail = customer.email;
    const customerName = customer.name;
    
    // Check if this is a trial subscription
    const isTrial = subscription.status === 'trialing' || subscription.trial_end;
    
    console.log('📋 Subscription details:', {
      customer_email: customerEmail,
      customer_name: customerName,
      subscription_status: subscription.status,
      is_trial: isTrial,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
    });
    
    if (isTrial) {
      console.log('🆕 Creating trial user in GHL (via subscription):', customerEmail);
      await createGHLTrialUser(customerEmail, customerName);
    } else {
      console.log('💎 Creating premium user in GHL (via subscription):', customerEmail);
      await createGHLPremiumUser(customerEmail, customerName);
    }
    
  } catch (error) {
    console.error('❌ Error handling trial creation:', error);
  }
}

// Handle trial conversion when first payment succeeds after trial
async function handleTrialConversionPayment(invoice) {
  try {
    console.log('💳 Processing invoice payment:', invoice.id);
    
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const customer = await stripe.customers.retrieve(invoice.customer);
    
    // Check if this is a trial conversion (first charge after trial period)
    const now = Math.floor(Date.now() / 1000);
    const isTrialConversion = 
      subscription.status === 'active' &&
      subscription.trial_end &&
      subscription.trial_end <= now && // Trial period has ended
      invoice.billing_reason === 'subscription_cycle' && // Regular billing cycle, not creation
      invoice.amount_paid > 0 && // Actual payment was made
      !subscription.metadata?.trial_converted; // Haven't already marked as converted
    
    // Log invoice details for debugging
    console.log('📋 Invoice details:', {
      invoiceId: invoice.id,
      billing_reason: invoice.billing_reason,
      amount_paid: invoice.amount_paid,
      customer_email: customer.email,
      subscription_status: subscription.status,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      already_converted: subscription.metadata?.trial_converted
    });

    if (isTrialConversion) {
      const chargeDate = new Date(invoice.status_update_time * 1000).toISOString();
      const customerEmail = customer.email;
      
      console.log('🔄 Trial conversion detected for:', customerEmail);
      console.log('📅 Charge date:', chargeDate);
      
      // Call our trial conversion API
      await triggerTrialConversion(customerEmail, chargeDate);
      
      // Update Stripe subscription metadata to reflect conversion
      await stripe.subscriptions.update(subscription.id, {
        metadata: {
          ...subscription.metadata,
          tier: 'premium',
          trial_converted: 'true',
          conversion_date: chargeDate
        }
      });
      
      console.log('✅ Trial conversion completed for:', customerEmail);
    } else {
      const reason = invoice.billing_reason === 'subscription_create' ? 'trial creation' :
                    invoice.amount_paid === 0 ? 'zero amount' :
                    !subscription.trial_end ? 'no trial period' :
                    subscription.trial_end > now ? 'trial still active' :
                    subscription.metadata?.trial_converted ? 'already converted' :
                    'other reason';
      console.log(`ℹ️ Not a trial conversion - ${reason}:`, {
        billing_reason: invoice.billing_reason,
        amount_paid: invoice.amount_paid,
        trial_ends: subscription.trial_end ? new Date(subscription.trial_end * 1000) : 'none'
      });
    }
    
  } catch (error) {
    console.error('❌ Error handling trial conversion payment:', error);
  }
}

// Handle subscription updates
async function handleSubscriptionUpdate(subscription) {
  try {
    console.log('📝 Subscription updated:', subscription.id);
    
    const customer = await stripe.customers.retrieve(subscription.customer);
    const customerEmail = customer.email;
    
    // Handle trial period ending
    if (subscription.trial_end && subscription.status === 'trialing') {
      const trialEndDate = new Date(subscription.trial_end * 1000);
      console.log(`⏰ Trial ends for ${customerEmail} on:`, trialEndDate);
      
      // You can add logic here for trial ending notifications
    }
    
  } catch (error) {
    console.error('❌ Error handling subscription update:', error);
  }
}

// Handle subscription cancellation
async function handleSubscriptionCancellation(subscription) {
  try {
    console.log('❌ Subscription cancelled:', subscription.id);
    
    const customer = await stripe.customers.retrieve(subscription.customer);
    const customerEmail = customer.email;
    
    console.log('📧 Cancellation for:', customerEmail);
    
    // Update GHL contact status
    await updateGHLContactStatus(customerEmail, 'cancelled');
    
  } catch (error) {
    console.error('❌ Error handling subscription cancellation:', error);
  }
}

// Handle payment failures
async function handlePaymentFailure(invoice) {
  try {
    console.log('💳 Payment failed for invoice:', invoice.id);
    
    const customer = await stripe.customers.retrieve(invoice.customer);
    const customerEmail = customer.email;
    
    console.log('📧 Payment failed for:', customerEmail);
    
    // Update GHL contact status
    await updateGHLContactStatus(customerEmail, 'payment_failed');
    
  } catch (error) {
    console.error('❌ Error handling payment failure:', error);
  }
}

// Call our trial conversion API
async function triggerTrialConversion(email, chargeDate) {
  try {
    const apiUrl = `${process.env.VERCEL_URL || 'https://postdoserx.com'}/api/ghl-integration`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'trial_conversion',
        email: email,
        chargeDate: chargeDate
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Trial conversion API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Trial conversion API response:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to trigger trial conversion:', error);
    throw error;
  }
}

// Create trial user in GHL
async function createGHLTrialUser(email, name) {
  try {
    const apiUrl = `${process.env.VERCEL_URL || 'https://postdoserx.com'}/api/ghl-integration`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create_contact',
        email: email,
        name: name,
        tier: 'trial'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GHL trial user creation failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Trial user created in GHL:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to create trial user in GHL:', error);
    throw error;
  }
}

// Create premium user in GHL
async function createGHLPremiumUser(email, name) {
  try {
    const apiUrl = `${process.env.VERCEL_URL || 'https://postdoserx.com'}/api/ghl-integration`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create_contact',
        email: email,
        name: name,
        tier: 'premium'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GHL premium user creation failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Premium user created in GHL:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to create premium user in GHL:', error);
    throw error;
  }
}

// Update GHL contact status for cancellations/failures
async function updateGHLContactStatus(email, status) {
  try {
    const apiUrl = `${process.env.VERCEL_URL || 'https://postdoserx.com'}/api/ghl-integration`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'update_status',
        email: email,
        status: status
      })
    });
    
    if (!response.ok) {
      console.log('⚠️ Failed to update GHL contact status (continuing anyway)');
    } else {
      console.log('✅ GHL contact status updated');
    }
    
  } catch (error) {
    console.log('⚠️ Error updating GHL contact status:', error);
  }
}