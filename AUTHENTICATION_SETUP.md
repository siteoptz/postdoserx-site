# PostDoseRX Authentication Implementation

This document outlines the complete authentication system implemented for PostDoseRX, following the requirements in the implementation plan.

## 🏗️ Architecture Overview

The authentication system consists of:

1. **Supabase Database** - User data storage with RLS
2. **JWT Authentication** - Secure token-based auth
3. **Vercel Serverless APIs** - Authentication endpoints
4. **Frontend Integration** - Login page and dashboard auth

## 📊 Database Schema

### Users Table
```sql
- id (UUID, Primary Key)
- email (VARCHAR, Unique)
- google_id (VARCHAR, Unique)
- tier (VARCHAR) - 'trial' | 'premium'
- subscription_status (VARCHAR) - 'active' | 'cancelled' | 'paused'
- stripe_customer_id (VARCHAR)
- ghl_contact_id (VARCHAR)
- created_at, updated_at (TIMESTAMP)
```

### User Profiles Table
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- first_name, last_name (VARCHAR)
- medication, dose (VARCHAR)
- injection_day (INTEGER) - 0-6 for Sunday-Saturday
- start_weight, goal_weight (DECIMAL)
- goals, dietary_preferences, allergies (TEXT[])
- notification_preferences (JSONB)
- onboarding_completed (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

## 🔐 API Endpoints

### Authentication Endpoints

#### `POST /api/auth/login`
Creates or updates user account and returns JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "googleId": "google-oauth-id",
  "name": "User Name",
  "tier": "trial|premium",
  "ghlContactId": "ghl-contact-id",
  "stripeCustomerId": "stripe-customer-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "tier": "trial",
      "profile": {...}
    },
    "token": "jwt-token"
  }
}
```

#### `GET /api/auth/me`
Validates JWT token and returns current user data.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "tier": "trial",
      "subscriptionStatus": "active",
      "createdAt": "2024-01-01T00:00:00Z",
      "profile": {...}
    }
  }
}
```

### User Profile Endpoints

#### `GET /api/users/me`
Returns user data with profile information.

#### `PUT /api/users/me`
Updates user profile information.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "medication": "Semaglutide",
  "dose": "1mg",
  "injectionDay": 1,
  "goals": ["weight-loss", "better-nutrition"],
  "onboardingCompleted": true
}
```

## 🌐 Frontend Integration

### Login Page Updates

The `login.html` has been updated to:

1. **Google OAuth Integration** - Uses new `/api/auth/login` endpoint
2. **Email Login** - Simplified flow for existing users
3. **Error Handling** - Better user feedback
4. **Tier Support** - Handles trial and premium tiers

### Dashboard Authentication

Use the provided `dashboard-auth.js` script in your app.postdoserx.com pages:

**Pages on `app.postdoserx.com` must use this full URL.** Do not use `/dashboard-auth.js` alone: that resolves to the app origin and will 404 if the dashboard is hosted separately from the marketing site.

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://postdoserx.com/dashboard-auth.js"></script>
</head>
<body>
    <script>
        // Initialize authentication
        window.addEventListener('DOMContentLoaded', async () => {
            const isAuthenticated = await initializeDashboardAuth();
            
            if (isAuthenticated) {
                const user = getCurrentUser();
                console.log('User:', user);
                loadDashboardData();
            }
        });
        
        // Make authenticated API calls
        async function loadUserData() {
            try {
                const response = await authenticatedFetch('/users/me');
                const data = await response.json();
                
                if (data.success) {
                    displayUserProfile(data.data);
                }
            } catch (error) {
                console.error('Failed to load user data:', error);
            }
        }
    </script>
</body>
</html>
```

## ⚙️ Environment Variables

Create a `.env.local` file with these variables:

```env
# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Configuration
JWT_SECRET=your-long-random-jwt-secret-key-here

# Stripe Configuration
STRIPE_SECRET_KEY=your-stripe-secret-key

# GoHighLevel Configuration
GHL_API_KEY=your-ghl-api-key
GHL_LOCATION_ID=your-ghl-location-id

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id

# CORS Origins
CORS_ORIGINS=postdoserx.com,app.postdoserx.com

# Environment
NODE_ENV=production
```

## 🚀 Deployment Steps

### 1. Database Setup

1. Create a Supabase project
2. Run the schema from `lib/database.js`
3. Set up environment variables

### 2. Vercel Deployment

1. Install dependencies: `npm install`
2. Set environment variables in Vercel dashboard
3. Deploy: `vercel --prod`

### 3. DNS Configuration

Ensure these domains point to your Vercel deployment:
- `postdoserx.com` - Main site with login
- `app.postdoserx.com` - Dashboard application

## 🔄 Authentication Flow

### 1. Login Process

1. User visits `postdoserx.com/login.html`
2. Signs in via Google OAuth or email
3. System calls `/api/auth/login`
4. User record created/updated in database
5. JWT token generated and returned
6. User redirected to `app.postdoserx.com` with token

### 2. Dashboard Access

1. Dashboard checks for token in URL or localStorage
2. Validates token via `/api/auth/me`
3. Sets up authenticated session
4. All API calls use JWT token
5. Automatic token refresh handling

### 3. API Protection

1. All user-specific endpoints require JWT
2. Row Level Security enforces user isolation
3. Tier-based access control
4. Automatic redirect on auth failure

## 🔒 Security Features

- **JWT Tokens** - Signed with secret key, 24-hour expiration
- **HTTP-Only Cookies** - Optional secure cookie storage
- **Row Level Security** - Database-level access control
- **CORS Protection** - Restricted to known domains
- **Input Validation** - All API inputs validated
- **Tier Enforcement** - Premium features gated properly

## 📱 User Tiers

### Trial Users
- Access to basic dashboard features
- Limited meal planning
- Basic symptom tracking

### Premium Users
- Full access to all features
- Advanced meal planning
- Comprehensive progress tracking
- Priority support

## 🧪 Testing

### Authentication Tests
```javascript
// Test user creation
const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'test@example.com',
        tier: 'trial'
    })
});

// Test token validation
const authResponse = await fetch('/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
});
```

### Dashboard Integration
1. Create two test users
2. Verify data isolation
3. Test tier restrictions
4. Confirm session handling

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors** - Check Vercel CORS configuration
2. **Token Validation Fails** - Verify JWT_SECRET matches
3. **Database Connection** - Check Supabase credentials
4. **Redirect Loops** - Verify dashboard auth logic

### Debug Mode
Enable verbose logging by setting:
```javascript
localStorage.setItem('debug', 'true');
```

This authentication system provides a secure, scalable foundation for the PostDoseRX platform, supporting both trial and premium users with proper data isolation and access controls.