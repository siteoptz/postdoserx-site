import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = 'postdoserx.com';
const JWT_AUDIENCE = 'postdoserx-users';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const secret = new TextEncoder().encode(JWT_SECRET);

export async function signJWT(payload, expiresIn = '24h') {
  try {
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .sign(secret);

    return jwt;
  } catch (error) {
    throw new Error(`Failed to sign JWT: ${error.message}`);
  }
}

export async function verifyJWT(token) {
  try {
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return payload;
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw new Error('Token has expired');
    }
    if (error instanceof jose.errors.JWTInvalid) {
      throw new Error('Token is invalid');
    }
    throw new Error(`Failed to verify JWT: ${error.message}`);
  }
}

export function extractTokenFromRequest(req) {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Try cookies as fallback
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenMatch = cookies.match(/auth_token=([^;]+)/);
    if (tokenMatch) {
      return tokenMatch[1];
    }
  }

  return null;
}

export async function authenticateRequest(req) {
  const token = extractTokenFromRequest(req);
  
  if (!token) {
    throw new Error('No authentication token provided');
  }

  try {
    const payload = await verifyJWT(token);
    return payload;
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

// Middleware helper for API routes
export function withAuth(handler) {
  return async (req, res) => {
    try {
      const payload = await authenticateRequest(req);
      req.user = payload;
      return handler(req, res);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: error.message
      });
    }
  };
}