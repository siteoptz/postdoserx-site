# App Integration Contract - Authentication Handoff

## Marketing → Dashboard Authentication Flow

The marketing site (`postdoserx.com`) handles initial authentication and hands off to the dashboard app (`app.postdoserx.com`) via URL hash parameters.

### Current Implementation

1. **Marketing Site**: Authenticates users via `/api/auth/login` 
2. **Token Handoff**: Redirects to `https://app.postdoserx.com/#token=...&email=...&userId=...`
3. **Dashboard App**: Must include `dashboard-auth.js` and call `initializeDashboardAuth()`

### Required App Changes

#### 1. Include Dashboard Auth Script
```html
<!-- In app.postdoserx.com HTML head -->
<script src="https://postdoserx.com/dashboard-auth.js"></script>
```

#### 2. Initialize Before Router
```javascript
// Call BEFORE client-side router strips URL hash
window.addEventListener('DOMContentLoaded', async () => {
  const isAuthenticated = await initializeDashboardAuth();
  // Then initialize your app router
});
```

#### 3. Critical App-Side Requirements

**IMPORTANT**: Hash parameters are client-side only and invisible to server middleware.

**Issue**: App middleware redirects `GET https://app.postdoserx.com/` to login before client JS can read hash.

**Required App Fixes**:

1. **Disable auth middleware on root route**:
```javascript
// middleware.js - Allow unauthenticated access to /
export function middleware(request) {
  // Skip auth check for root - let client JS handle hash tokens
  if (request.nextUrl.pathname === '/') {
    return NextResponse.next();
  }
  
  // Apply auth middleware to other routes
  // Your existing auth logic for /dashboard, /profile, etc.
}
```

2. **Load dashboard-auth.js synchronously BEFORE router**:
```html
<!-- In app HTML head - BEFORE any router scripts -->
<script src="https://postdoserx.com/dashboard-auth.js"></script>
<script>
  // Call immediately when DOM loads, BEFORE client router
  window.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await initializeDashboardAuth();
    if (!isAuthenticated) {
      window.location.href = 'https://postdoserx.com/login.html';
    }
    // Only then load your app router
  });
</script>
```

### Hash Parameters Format

Marketing redirects with these hash parameters:
```
https://app.postdoserx.com/#token=jwt.token.here&email=user@example.com&userId=uuid&tier=trial&name=UserName&new=true
```

### Dashboard Auth Contract

The `dashboard-auth.js` script provides:
- `getMergedUrlParams()` - Merges search + hash parameters
- `initializeDashboardAuth()` - Processes token handoff
- `cleanURL()` - Removes auth parameters from URL
- `authenticatedFetch()` - API requests with JWT

### Debugging App-Side Issues

**Marketing-side fixes are complete. Issues now require app team debugging:**

**Step 1: Verify dashboard-auth.js Integration**
```bash
# Check if dashboard auth script is included
curl -s "https://app.postdoserx.com/" | grep "dashboard-auth.js"

# Verify script loads and function exists
# In browser console on app.postdoserx.com:
typeof initializeDashboardAuth
// Should return "function"
```

**Step 2: Find Redirect Source in App**  
```bash
# Search for redirects to login.html in app codebase
grep -r "login.html" app/
grep -r "postdoserx.com/login" app/
grep -r "window.location" app/middleware/
```

**Step 3: Network Analysis**
- DevTools → Network → Navigate to `https://app.postdoserx.com/#token=...`
- Document any 302 redirects that occur before client JS runs
- Check if first request to app root returns redirect instead of HTML

**Step 4: Middleware Investigation**
- Examine app middleware/auth guards that run on `/` route
- Verify middleware allows unauthenticated access to root with hash parameters
- Check if middleware strips hash before client JS can access it

### Test Sequence

1. **Google OAuth**: `postdoserx.com/login.html` → Google → Dashboard
2. **Email Login**: `postdoserx.com/login.html` → Email → Dashboard  
3. **Signup Flow**: `postdoserx.com#signup` → Auth → Dashboard

All should land on `app.postdoserx.com` with working authentication.