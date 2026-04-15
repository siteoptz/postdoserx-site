/**
 * Shared HTTP input validation helpers for Vercel serverless routes.
 */

/**
 * @param {import('http').IncomingMessage} req
 * @param {string[]} allowedMethods
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
export function validateHttpMethod(req, allowedMethods) {
  const method = (req.method || '').toUpperCase();
  const allowed = allowedMethods.map((m) => m.toUpperCase());
  if (!allowed.includes(method)) {
    return { ok: false, status: 405, error: 'Method not allowed' };
  }
  return { ok: true };
}

/**
 * @param {string | string[] | undefined} header
 * @returns {{ ok: true, token: string } | { ok: false, status: number, error: string }}
 */
export function validateAuthorizationBearer(header) {
  const value = Array.isArray(header) ? header[0] : header;
  if (value == null || typeof value !== 'string') {
    return { ok: false, status: 401, error: 'Missing authorization header' };
  }
  const trimmed = value.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) {
    return { ok: false, status: 401, error: 'Invalid authorization header' };
  }
  const token = trimmed.slice(7).trim();
  if (!token) {
    return { ok: false, status: 401, error: 'Empty bearer token' };
  }
  return { ok: true, token };
}

/**
 * GET /api/auth/me — allow Bearer or HttpOnly auth_token cookie (matches jwt.extractTokenFromRequest).
 * @param {import('http').IncomingMessage} req
 */
export function validateAuthMeRequest(req) {
  const methodCheck = validateHttpMethod(req, ['GET']);
  if (!methodCheck.ok) return methodCheck;

  const authHeader = req.headers?.authorization;
  if (authHeader && typeof authHeader === 'string') {
    const t = authHeader.trim();
    if (t.toLowerCase().startsWith('bearer ') && t.slice(7).trim()) {
      return { ok: true };
    }
  }

  const cookie = req.headers?.cookie;
  if (cookie && typeof cookie === 'string') {
    const m = cookie.match(/auth_token=([^;]+)/);
    if (m && m[1]) return { ok: true };
  }

  return { ok: false, status: 401, error: 'No authentication token provided' };
}

/**
 * Stripe webhook: when STRIPE_WEBHOOK_SECRET is set, require Stripe-Signature.
 * @param {string | string[] | undefined} stripeSignatureHeader
 * @param {boolean} signatureRequired
 */
export function validateStripeWebhookInputs(stripeSignatureHeader, signatureRequired) {
  if (!signatureRequired) {
    return { ok: true };
  }
  const sig = Array.isArray(stripeSignatureHeader)
    ? stripeSignatureHeader[0]
    : stripeSignatureHeader;
  if (sig == null || typeof sig !== 'string' || !sig.trim()) {
    return { ok: false, status: 400, error: 'Missing Stripe-Signature header' };
  }
  return { ok: true };
}
