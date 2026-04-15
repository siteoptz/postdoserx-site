/**
 * CORS for browser fetch() with JSON bodies (requires preflight).
 * Never combine Access-Control-Allow-Origin: * with Allow-Credentials: true — invalid per spec.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{ methods?: string, allowHeaders?: string }} [opts]
 */
export function setCorsHeaders(req, res, opts = {}) {
  const methods = opts.methods ?? 'POST, OPTIONS';
  const allowHeaders =
    opts.allowHeaders ?? 'Content-Type, Authorization';

  const origin = req.headers.origin;
  if (origin && typeof origin === 'string') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', allowHeaders);
  res.setHeader('Vary', 'Origin');
}
