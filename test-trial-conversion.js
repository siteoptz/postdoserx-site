// Test script for trial conversion webhook
// Run this with: node test-trial-conversion.js

const testTrialConversionWebhook = async () => {
  console.log('🧪 Testing Trial Conversion Webhook...\n');

  // Simulate Stripe webhook payload for trial conversion
  const webhookPayload = {
    id: 'evt_test_trial_conversion',
    object: 'event',
    type: 'invoice.payment_succeeded',
    data: {
      object: {
        id: 'in_test_trial_conversion',
        customer: 'cus_test_customer',
        subscription: 'sub_test_subscription',
        billing_reason: 'subscription_cycle',
        status_update_time: Math.floor(Date.now() / 1000),
        amount_paid: 999, // $9.99 in cents
        currency: 'usd'
      }
    }
  };

  // Mock Stripe subscription data (what webhook will fetch)
  const mockSubscription = {
    id: 'sub_test_subscription',
    status: 'active',
    trial_end: Math.floor((Date.now() - 86400000) / 1000), // Ended yesterday
    metadata: {
      tier: 'trial',
      original_signup_date: new Date(Date.now() - 7 * 86400000).toISOString()
    }
  };

  // Mock Stripe customer data
  const mockCustomer = {
    id: 'cus_test_customer',
    email: 'antonio@siteoptz.com',
    name: 'Antonio Test User'
  };

  console.log('📧 Customer Email:', mockCustomer.email);
  console.log('📅 Trial End Date:', new Date(mockSubscription.trial_end * 1000));
  console.log('💳 Charge Date:', new Date(webhookPayload.data.object.status_update_time * 1000));
  console.log('🔄 Billing Reason:', webhookPayload.data.object.billing_reason);
  console.log('🏷️  Original Tier:', mockSubscription.metadata.tier);
  console.log('\n🎯 This should trigger trial conversion!');

  // Test the trial conversion API call
  try {
    const chargeDate = new Date(webhookPayload.data.object.status_update_time * 1000).toISOString();
    
    console.log('\n📡 Calling trial conversion API...');
    
    const response = await fetch('https://postdoserx.com/api/ghl-integration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'trial_conversion',
        email: mockCustomer.email,
        chargeDate: chargeDate
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Trial conversion API success:', result);
    } else {
      console.log('❌ Trial conversion API failed:', result);
    }

  } catch (error) {
    console.error('❌ Error testing trial conversion:', error);
  }
};

// Test webhook endpoint directly
const testWebhookEndpoint = async () => {
  console.log('\n🔗 Testing webhook endpoint directly...');

  // Create a test webhook payload
  const testEvent = {
    id: 'evt_test_webhook',
    object: 'event', 
    type: 'invoice.payment_succeeded',
    data: {
      object: {
        id: 'in_test_webhook',
        customer: 'cus_test_webhook_customer',
        subscription: 'sub_test_webhook_subscription',
        billing_reason: 'subscription_cycle',
        status_update_time: Math.floor(Date.now() / 1000)
      }
    }
  };

  try {
    const response = await fetch('https://postdoserx.com/api/stripe-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, Stripe will include the signature header
        // 'stripe-signature': 'test_signature'
      },
      body: JSON.stringify(testEvent)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Webhook endpoint responded:', result);
    } else {
      console.log('❌ Webhook endpoint error:', result);
    }

  } catch (error) {
    console.error('❌ Error testing webhook endpoint:', error);
  }
};

// Run tests
const runTests = async () => {
  console.log('🚀 PostDoseRX Trial Conversion Webhook Tests\n');
  console.log('=' .repeat(50));
  
  await testTrialConversionWebhook();
  await testWebhookEndpoint();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Tests completed!');
};

// Export for use or run directly
if (require.main === module) {
  runTests();
}

module.exports = { testTrialConversionWebhook, testWebhookEndpoint };