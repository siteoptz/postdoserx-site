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

#### 3. Middleware Changes (if using Next.js/middleware)
If your app has middleware that redirects unauthenticated users:

```javascript
// middleware.js - Allow auth callback routes
export function middleware(request) {
  // Skip auth redirect if hash contains token (marketing handoff)
  if (request.nextUrl.pathname === '/' && 
      request.nextUrl.hash && 
      request.nextUrl.hash.includes('token=')) {
    return NextResponse.next();
  }
  
  // Your existing auth middleware...
}
```

**OR** create a dedicated callback route:
```javascript
// Allow /auth/callback to bypass middleware
export const config = {
  matcher: ['/((?!auth/callback|_next/static|_next/image|favicon.ico).*)']
}
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

### Troubleshooting

**If users still redirect back to login**:
1. Ensure `dashboard-auth.js` loads before app router
2. Check middleware is not blocking `/` with hash parameters  
3. Verify `initializeDashboardAuth()` is called on page load
4. Check browser DevTools for JavaScript errors

### Test Sequence

1. **Google OAuth**: `postdoserx.com/login.html` → Google → Dashboard
2. **Email Login**: `postdoserx.com/login.html` → Email → Dashboard  
3. **Signup Flow**: `postdoserx.com#signup` → Auth → Dashboard

All should land on `app.postdoserx.com` with working authentication.