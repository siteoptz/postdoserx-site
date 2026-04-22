/**
 * Shared rules for "who can log in" and marketing "existing account" hints.
 * Keep in sync with /api/auth/login.
 */

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
// Match /api/auth/login: allow env override; same defaults as prior inline implementation
const GHL_API_KEY = process.env.GHL_API_KEY || 'pit-e2c103d1-89c7-4e4a-9376-e3b50257d66b';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || 'ECu5ScdYFmB0WnhvYoBU';

export function tierFromGhlTags(tags) {
  const list = Array.isArray(tags) ? tags : [];
  let tier = 'trial';
  if (list.some((tag) => String(tag).includes('premium') || String(tag).includes('paid'))) {
    tier = 'premium';
  } else if (list.some((tag) => String(tag).includes('trial'))) {
    tier = 'trial';
  }
  return tier;
}

/**
 * LeadConnector contact for this email, with `qualified` when PostDose tag(s) are present.
 */
export async function fetchGhlContactEntitlement(email) {
  const url = `${GHL_API_BASE}/contacts/search?email=${encodeURIComponent(email)}&locationId=${GHL_LOCATION_ID}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GHL_API_KEY}`,
      'Content-Type': 'application/json',
      Version: '2021-07-28',
    },
  });

  if (!response.ok) {
    throw new Error(`GHL Search Error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.contacts || data.contacts.length === 0) {
    return null;
  }

  const contact = data.contacts[0];
  const tags = contact.tags || [];
  const hasPostDoseTag = tags.some((t) => String(t).toLowerCase().includes('postdoserx'));
  if (!hasPostDoseTag) {
    console.log(
      '🚫 GHL contact exists but is not a PostDose contact (missing postdoserx tag). Not entitled.'
    );
  }

  const qualified = hasPostDoseTag;
  const tier = tierFromGhlTags(tags);

  return {
    qualified,
    tier,
    contactId: contact.id,
    tags,
    customFields: contact.customFields || {},
  };
}

export function isProvisionedUser(user) {
  if (!user) return false;
  if (user.ghl_contact_id) return true;
  const status = (user.subscription_status || '').toLowerCase();
  if (['active', 'trialing', 'paid', 'past_due'].includes(status)) return true;
  return false;
}

export function isDbSubscriptionEntitled(user) {
  if (!user) return false;
  const status = (user.subscription_status || '').toLowerCase();
  return ['active', 'trialing', 'paid', 'past_due'].includes(status);
}

/**
 * Marketing modal / email check: should we send this address to login?
 * Matches the successful path of POST /api/auth/login (not JWT issuance).
 */
export function marketingAccountEligibleForLogin({ user, ghlResult, ghlFailed }) {
  const provisioned = isProvisionedUser(user);
  const dbEntitled = isDbSubscriptionEntitled(user);
  if (provisioned || dbEntitled) return true;
  if (ghlFailed) return false;
  return !!(ghlResult && ghlResult.qualified);
}

export function marketingTierHint({ user, ghlResult }) {
  if (user?.tier) return user.tier;
  return ghlResult?.tier || 'trial';
}
