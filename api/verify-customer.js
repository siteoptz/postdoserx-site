// Vercel Serverless Function for GoHighLevel Customer Verification
// File: /api/verify-customer.js

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // GoHighLevel API Configuration
    const GHL_API_URL = process.env.GHL_API_URL || 'https://rest.gohighlevel.com/v1';
    const GHL_API_KEY = process.env.GHL_API_KEY; // Set in Vercel environment variables
    const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID; // Your GHL location ID
    
    if (!GHL_API_KEY) {
      console.error('GHL_API_KEY not configured');
      return res.status(500).json({ error: 'Authentication service unavailable' });
    }
    
    // Method 1: Check GoHighLevel contacts
    const contactResponse = await fetch(`${GHL_API_URL}/contacts/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        email: email,
        locationId: GHL_LOCATION_ID
      }
    });
    
    let isValidCustomer = false;
    let customerData = null;
    
    if (contactResponse.ok) {
      const contactData = await contactResponse.json();
      
      // Check if contact exists and has active subscription
      if (contactData.contacts && contactData.contacts.length > 0) {
        const contact = contactData.contacts[0];
        
        // Check for PostDoseRX Premium subscription indicators
        // This could be a tag, custom field, or pipeline status
        const hasValidSubscription = checkSubscriptionStatus(contact);
        
        if (hasValidSubscription) {
          isValidCustomer = true;
          customerData = {
            name: contact.firstName + ' ' + contact.lastName,
            email: contact.email,
            subscriptionType: getSubscriptionType(contact),
            lastActive: contact.lastActivity
          };
        }
      }
    }
    
    // Method 2: Alternative - Check Stripe via GHL webhook data
    if (!isValidCustomer) {
      const stripeCustomer = await checkStripeSubscription(email);
      if (stripeCustomer) {
        isValidCustomer = true;
        customerData = stripeCustomer;
      }
    }
    
    // Method 3: Fallback - Demo customers for testing
    if (!isValidCustomer && process.env.NODE_ENV === 'development') {
      const demoCustomers = [
        'demo@postdoserx.com',
        'test@postdoserx.com',
        'customer@postdoserx.com'
      ];
      
      if (demoCustomers.includes(email.toLowerCase())) {
        isValidCustomer = true;
        customerData = {
          name: 'Demo User',
          email: email,
          subscriptionType: 'premium',
          lastActive: new Date().toISOString()
        };
      }
    }
    
    // Log verification attempt (for analytics)
    console.log(`Customer verification for ${email}: ${isValidCustomer ? 'VALID' : 'INVALID'}`);
    
    return res.status(200).json({
      isValidCustomer,
      customerData: isValidCustomer ? customerData : null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Customer verification error:', error);
    return res.status(500).json({ 
      error: 'Verification service error',
      isValidCustomer: false 
    });
  }
}

// Helper function to check subscription status in GHL contact
function checkSubscriptionStatus(contact) {
  // Method 1: Check for specific tags
  const premiumTags = ['postdoserx-premium', 'nourishrx-subscriber', 'premium-active'];
  const contactTags = contact.tags || [];
  
  for (const tag of premiumTags) {
    if (contactTags.includes(tag)) {
      return true;
    }
  }
  
  // Method 2: Check custom fields
  const customFields = contact.customFields || {};
  if (customFields.subscription_status === 'active' || 
      customFields.postdoserx_premium === 'true') {
    return true;
  }
  
  // Method 3: Check pipeline stage
  if (contact.pipeline && contact.pipeline.stage === 'active-subscriber') {
    return true;
  }
  
  return false;
}

// Get subscription type from contact data
function getSubscriptionType(contact) {
  const customFields = contact.customFields || {};
  return customFields.subscription_type || 'premium';
}

// Alternative method: Check Stripe subscription directly
async function checkStripeSubscription(email) {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    
    if (!STRIPE_SECRET_KEY) {
      return null;
    }
    
    // Query Stripe for customer with this email
    const stripeResponse = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}`, {
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`
      }
    });
    
    if (stripeResponse.ok) {
      const stripeData = await stripeResponse.json();
      
      if (stripeData.data && stripeData.data.length > 0) {
        const customer = stripeData.data[0];
        
        // Check if customer has active subscription
        const subscriptionsResponse = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=active`, {
          headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`
          }
        });
        
        if (subscriptionsResponse.ok) {
          const subscriptionData = await subscriptionsResponse.json();
          
          if (subscriptionData.data && subscriptionData.data.length > 0) {
            return {
              name: customer.name || 'Premium Customer',
              email: customer.email,
              subscriptionType: 'premium',
              stripeCustomerId: customer.id,
              lastActive: new Date().toISOString()
            };
          }
        }
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('Stripe verification error:', error);
    return null;
  }
}