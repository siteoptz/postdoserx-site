// Stripe Customer Portal API for PostDoseRX
// Creates customer portal sessions for billing management

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
    const { customerId, email } = req.body;

    // Validate required fields
    if (!customerId && !email) {
      return res.status(400).json({ 
        error: 'Either customerId or email is required' 
      });
    }

    let customer;
    
    if (customerId) {
      // Use provided customer ID
      try {
        customer = await stripe.customers.retrieve(customerId);
      } catch (error) {
        console.error('Customer ID not found:', customerId);
        return res.status(404).json({ error: 'Customer not found' });
      }
    } else {
      // Find customer by email
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      });
      
      if (customers.data.length === 0) {
        return res.status(404).json({ 
          error: 'No Stripe customer found for this email' 
        });
      }
      
      customer = customers.data[0];
    }

    console.log('Creating portal session for customer:', customer.id);

    // Create Stripe customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: 'https://app.postdoserx.com', // Return to dashboard
    });

    console.log('Portal session created:', portalSession.id);

    return res.status(200).json({
      success: true,
      url: portalSession.url,
      customerId: customer.id
    });

  } catch (error) {
    console.error('Stripe portal session error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create portal session',
      fallback: 'Please contact support for billing assistance'
    });
  }
}