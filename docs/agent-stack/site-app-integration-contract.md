# Site ↔ App Integration Contract

## Executive Summary

**Purpose**: Define the canonical authentication and navigation contract between the marketing site (postdoserx.com) and the product application (app.postdoserx.com) to prevent user bounce loops and authentication failures.

**Critical Issue**: Post-checkout and Google auth flows currently bounce users between domains, creating authentication failures and poor user experience.

**Resolution**: Establish single source of truth for token format, redirect flows, and failure handling.

## Domain Architecture

### Marketing Domain: `postdoserx.com`
- **Purpose**: Lead generation, marketing, subscription signup
- **Auth Responsibility**: Initial authentication collection and handoff
- **Key Pages**: index.html, login.html, signup-modal.html, success.html

### Product Domain: `app.postdoserx.com` 
- **Purpose**: Dashboard, meal planning, user account management
- **Auth Responsibility**: Session management, authenticated user experience
- **Key Features**: Dashboard, subscription management, content delivery

## Canonical Redirect Flow

### 1. **New User Registration Flow**
```
User → postdoserx.com/signup → Stripe Checkout → postdoserx.com/success.html → app.postdoserx.com/dashboard
```

**Success Path**:
1. User completes signup on marketing site
2. Redirected to Stripe for payment processing
3. Returns to `success.html` with session token
4. `success.html` validates token and redirects to `app.postdoserx.com/dashboard`
5. Dashboard receives token and establishes authenticated session

### 2. **Existing User Login Flow**
```
User → postdoserx.com/login.html → Authentication → app.postdoserx.com/dashboard
```

**Success Path**:
1. User enters credentials on marketing site login
2. Authentication validated against customer database
3. JWT token generated and stored
4. Redirect to `app.postdoserx.com/dashboard` with token
5. Dashboard validates token and loads user session

### 3. **Google OAuth Flow**
```
User → Google OAuth → postdoserx.com/login.html → app.postdoserx.com/dashboard
```

**Success Path**:
1. User initiates Google OAuth from marketing site
2. OAuth callback returns to marketing site login
3. Marketing site validates OAuth and generates token
4. Redirect to dashboard with validated session

## Token Format (Single Source of Truth)

### JWT Structure
```javascript
{
  "sub": "user_id",           // Unique user identifier
  "email": "user@example.com", // User email address
  "subscription_id": "sub_...", // Stripe subscription ID
  "subscription_status": "active|trial|canceled", // Current status
  "iat": 1234567890,          // Issued at timestamp
  "exp": 1234567890,          // Expiration timestamp
  "iss": "postdoserx.com",    // Issuer domain
  "aud": "app.postdoserx.com" // Audience domain
}
```

### Storage Contract
- **Marketing Site**: Store token in `localStorage['auth_token']` for handoff
- **Dashboard**: Validate and move token to secure storage
- **Expiry**: 24 hours for cross-domain tokens, 7 days for dashboard sessions

## Allowed Redirect Targets

### From Marketing Site (`postdoserx.com`)
**Allowed**:
- `https://app.postdoserx.com/dashboard`
- `https://app.postdoserx.com/dashboard?welcome=true` (new users)
- `https://app.postdoserx.com/subscription` (subscription issues)

**Forbidden**:
- Any external domains (security risk)
- HTTP protocols (security risk)
- Dashboard deep links without proper token validation

### From Dashboard (`app.postdoserx.com`)
**Allowed** (logout/unauthenticated):
- `https://postdoserx.com/login.html`
- `https://postdoserx.com/login.html?expired=true` (session expired)
- `https://postdoserx.com/` (home page)

**Forbidden**:
- Direct access to success.html (payment flow only)
- Any other marketing site internal pages

## Failure Handling

### Authentication Failures
**Scenario**: Invalid credentials, expired tokens, OAuth failures

**Response**:
1. Clear all stored tokens
2. Redirect to `postdoserx.com/login.html?error=auth_failed`
3. Display clear error message
4. Allow retry without redirect loop

### Token Validation Failures
**Scenario**: Dashboard cannot validate incoming token

**Response**:
1. Log validation failure details
2. Redirect to `postdoserx.com/login.html?error=token_invalid`
3. Clear corrupted tokens
4. Request fresh authentication

### Subscription Issues
**Scenario**: User authenticated but subscription expired/canceled

**Response**:
1. Maintain authentication session
2. Redirect to `app.postdoserx.com/subscription` (not marketing site)
3. Allow subscription renewal from within dashboard
4. Avoid forcing re-authentication

### Network/API Failures
**Scenario**: Unable to validate authentication with backend services

**Response**:
1. Implement retry logic (3 attempts)
2. Fallback to cached authentication state if available
3. If persistent failure: redirect to `postdoserx.com/login.html?error=service_unavailable`
4. Display maintenance message with retry option

## Test Matrix for Checkout→Auth→Dashboard

### Critical Path Testing

| Scenario | Expected Flow | Success Criteria | Current Issues |
|----------|---------------|------------------|----------------|
| **New User Signup** | Signup → Stripe → Success → Dashboard | Lands on dashboard with active session | ⚠️ Bounce to login |
| **Existing User Login** | Login → Dashboard | Direct access to dashboard | ⚠️ Redirect loop |
| **Google OAuth New** | OAuth → Marketing → Dashboard | Seamless dashboard access | ⚠️ Token handoff fails |
| **Google OAuth Existing** | OAuth → Dashboard | Existing user recognition | ⚠️ Creates duplicate flow |
| **Session Expiry** | Dashboard → Login → Dashboard | Smooth re-authentication | ⚠️ Loss of return URL |
| **Subscription Expiry** | Dashboard → Subscription page | In-app renewal flow | ⚠️ Kicks to marketing |

### Integration Points to Test

#### 1. **success.html Integration**
```javascript
// File: success.html
// Test: Token generation and dashboard redirect
function handleSuccessRedirect() {
  const token = generateAuthToken();
  localStorage.setItem('auth_token', token);
  window.location.href = 'https://app.postdoserx.com/dashboard';
}
```

#### 2. **dashboard-auth.js Integration**
```javascript
// File: dashboard-auth.js  
// Test: Token validation and session establishment
function validateIncomingToken() {
  const token = localStorage.getItem('auth_token');
  if (validateJWT(token)) {
    establishSession(token);
    localStorage.removeItem('auth_token'); // Clear handoff token
  } else {
    redirectToLogin('token_invalid');
  }
}
```

#### 3. **login.html Integration**
```javascript
// File: login.html
// Test: Authentication and dashboard redirect
function handleLoginSuccess(authData) {
  const token = generateJWT(authData);
  localStorage.setItem('auth_token', token);
  window.location.href = 'https://app.postdoserx.com/dashboard';
}
```

#### 4. **API Auth Endpoints**
- **api/auth/login.js**: Validates credentials and generates tokens
- **api/auth/me.js**: Returns user data for dashboard session
- **api/get-subscription-status.js**: Subscription validation for dashboard

## Implementation Requirements

### Immediate Priorities (Before Strict Enforcement)
1. **Standardize token format**: Implement JWT structure across all auth points
2. **Fix redirect loops**: Ensure single-direction flow from marketing to dashboard  
3. **Handle OAuth properly**: Consistent token generation for Google auth
4. **Test all paths**: Verify each scenario in the test matrix

### Code Changes Required
1. **success.html**: Implement proper token handoff
2. **dashboard-auth.js**: Add token validation on dashboard load
3. **login.html**: Standardize authentication response handling
4. **api/auth/***: Ensure consistent JWT generation and validation

### Verification Commands
```bash
# Test authentication integration
npm run test:auth:integration

# Test redirect flows  
npm run test:redirect:flows

# Test token validation
npm run test:token:validation

# End-to-end flow testing
npm run test:e2e:auth
```

## Security Considerations

### Cross-Domain Token Security
- Use HTTPS-only for all token transmission
- Implement CSRF protection on authentication endpoints
- Validate token audience and issuer claims
- Short-lived cross-domain tokens (24 hours max)

### Session Security
- Secure HttpOnly cookies for dashboard sessions
- Implement proper logout/session invalidation
- Monitor for session hijacking attempts
- Rate limiting on authentication endpoints

## Monitoring and Alerting

### Key Metrics
- Authentication success rate (target: >98%)
- Redirect loop incidents (target: 0)
- Token validation failures (target: <2%)
- User session establishment time (target: <3 seconds)

### Alert Conditions
- Authentication success rate drops below 95%
- More than 5 redirect loops per hour
- Token validation failure rate exceeds 5%
- New user activation time exceeds 10 seconds

---

**Contract Version**: 1.0  
**Last Updated**: April 15, 2026  
**Owner**: Engineering Team  
**Review Frequency**: After each authentication-related change