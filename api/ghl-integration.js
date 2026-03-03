// GoHighLevel Integration API
// Handles user tier validation and contact management

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = 'v1';

// Environment variables (set in Vercel dashboard)
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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

  if (req.method === 'POST') {
    const { action, email, name, tier, phone } = req.body;

    try {
      if (action === 'create_contact') {
        // Create new contact in GHL with tier tag
        const contactData = await createGHLContact(email, name, tier, phone);
        return res.status(200).json({
          success: true,
          contact: contactData,
          message: `Contact created with ${tier} tier`
        });
      }

      if (action === 'validate_tier') {
        // Validate user tier from GHL
        const tierData = await validateUserTier(email);
        return res.status(200).json({
          success: true,
          tier: tierData.tier,
          contactId: tierData.contactId,
          tags: tierData.tags
        });
      }

      if (action === 'upgrade_tier') {
        // Upgrade user from trial to premium
        const upgradeData = await upgradeUserTier(email);
        return res.status(200).json({
          success: true,
          message: 'User upgraded to premium',
          tier: 'premium'
        });
      }

    } catch (error) {
      console.error('GHL Integration Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        fallbackTier: 'trial' // Fallback to trial on error
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Create contact in GoHighLevel
async function createGHLContact(email, name = '', tier = 'trial', phone = '') {
  const url = `${GHL_API_BASE}/${GHL_API_VERSION}/contacts/`;
  
  const contactData = {
    email,
    firstName: name.split(' ')[0] || '',
    lastName: name.split(' ').slice(1).join(' ') || '',
    phone: phone || '',
    locationId: GHL_LOCATION_ID,
    tags: [
      `postdoserx-${tier}`,
      'postdoserx-customer',
      `signup-${new Date().toISOString().split('T')[0]}`
    ],
    customFields: [
      {
        key: 'subscription_tier',
        value: tier
      },
      {
        key: 'signup_date',
        value: new Date().toISOString()
      },
      {
        key: 'platform',
        value: 'postdoserx-dashboard'
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GHL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(contactData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GHL API Error: ${response.status} - ${error}`);
  }

  return await response.json();
}

// Validate user tier from GoHighLevel
async function validateUserTier(email) {
  const url = `${GHL_API_BASE}/${GHL_API_VERSION}/contacts/search?email=${encodeURIComponent(email)}&locationId=${GHL_LOCATION_ID}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GHL_API_KEY}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`GHL Search Error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.contacts || data.contacts.length === 0) {
    // User not found, create as trial user
    await createGHLContact(email, '', 'trial');
    return { tier: 'trial', contactId: null, tags: ['postdoserx-trial'] };
  }

  const contact = data.contacts[0];
  const tags = contact.tags || [];
  
  // Determine tier from tags
  let tier = 'trial'; // default
  if (tags.some(tag => tag.includes('premium') || tag.includes('paid'))) {
    tier = 'premium';
  } else if (tags.some(tag => tag.includes('trial'))) {
    tier = 'trial';
  }

  return {
    tier,
    contactId: contact.id,
    tags: tags,
    customFields: contact.customFields || {}
  };
}

// Upgrade user tier from trial to premium
async function upgradeUserTier(email) {
  const url = `${GHL_API_BASE}/${GHL_API_VERSION}/contacts/search?email=${encodeURIComponent(email)}&locationId=${GHL_LOCATION_ID}`;
  
  // First, find the contact
  const searchResponse = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GHL_API_KEY}`,
      'Content-Type': 'application/json',
    }
  });

  if (!searchResponse.ok) {
    throw new Error(`GHL Search Error: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  
  if (!searchData.contacts || searchData.contacts.length === 0) {
    throw new Error('Contact not found for upgrade');
  }

  const contact = searchData.contacts[0];
  const contactId = contact.id;

  // Update contact tags and custom fields
  const updateUrl = `${GHL_API_BASE}/${GHL_API_VERSION}/contacts/${contactId}`;
  
  const updatedTags = contact.tags.filter(tag => !tag.includes('trial')).concat([
    'postdoserx-premium',
    `upgrade-${new Date().toISOString().split('T')[0]}`
  ]);

  const updateData = {
    tags: updatedTags,
    customFields: [
      ...(contact.customFields || []).filter(field => field.key !== 'subscription_tier'),
      {
        key: 'subscription_tier',
        value: 'premium'
      },
      {
        key: 'upgrade_date',
        value: new Date().toISOString()
      }
    ]
  };

  const updateResponse = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${GHL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData)
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    throw new Error(`GHL Update Error: ${updateResponse.status} - ${error}`);
  }

  return await updateResponse.json();
}