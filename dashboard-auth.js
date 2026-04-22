/**
 * Dashboard Authentication Script for app.postdoserx.com
 * 
 * This script should be included in the app.postdoserx.com dashboard pages
 * to handle JWT authentication and user session management.
 * 
 * Usage:
 * 1. Include this script in your dashboard HTML
 * 2. Call initializeDashboardAuth() when the page loads
 * 3. Use authenticatedFetch() for API calls that require authentication
 */

/**
 * Merge query string and hash fragment (same shape as URLSearchParams).
 * Hash is not sent to the server — marketing login puts token here so app middleware cannot strip auth before JS runs.
 */
function getMergedUrlParams() {
  const search = new URLSearchParams(window.location.search);
  let hash = new URLSearchParams();
  if (window.location.hash && window.location.hash.length > 1) {
    try {
      hash = new URLSearchParams(window.location.hash.slice(1));
    } catch (e) {
      console.warn('Could not parse URL hash params:', e);
    }
  }
  const merged = new URLSearchParams(search);
  for (const [k, v] of hash.entries()) {
    merged.set(k, v);
  }
  return merged;
}

class DashboardAuth {
  constructor() {
    this.token = null;
    this.user = null;
    this.baseURL = 'https://postdoserx.com/api'; // Main API endpoint
  }

  /**
   * Initialize dashboard authentication
   * Uses URL hash/query token handoff, then falls back to stored token
   */
  async init() {
    console.log('🚀 Dashboard auth initializing...');
    
    // Read incoming params from both query and hash
    const urlParams = getMergedUrlParams();
    const hasDeprecatedHandoffParam = urlParams.get('handoff') === 'true';

    if (hasDeprecatedHandoffParam) {
      console.warn('⚠️ Deprecated handoff parameter detected (?handoff=true).');
      console.warn('⚠️ Expected flow is hash token handoff: app.postdoserx.com/#token=...');
      // Clear deprecated marker so it does not trigger repeated confusion/debug noise.
      this.cleanURL();
    }
    
    // PRIORITY 1: URL parameter/hash token handoff
    // CRITICAL: Prevent infinite redirect loops by checking if we just came from login
    const fromLogin = urlParams.get('token') && urlParams.get('email');
    
    if (fromLogin) {
      console.log('🔄 Detected legacy redirect from login page - preventing any further redirects during this session');
      // Set a flag to prevent redirects for this session
      sessionStorage.setItem('prevent_auth_redirect', 'true');
    }
    
    // Check for token in URL parameters (legacy fallback)
    const tokenFromURL = urlParams.get('token');
    const emailFromURL = urlParams.get('email');
    const tierFromURL = urlParams.get('tier');
    const userIdFromURL = urlParams.get('userId');
    const nameFromURL = urlParams.get('name');
    
    console.log('📋 Legacy URL params:', { 
      hasToken: !!tokenFromURL, 
      email: emailFromURL, 
      tier: tierFromURL, 
      userId: userIdFromURL 
    });
    
    // If we have URL parameters, use them - NEVER redirect
    if (tokenFromURL && emailFromURL) {
      console.log('⚠️ Using legacy URL parameters (consider upgrading to secure handoff)');
      
      // Store token but DON'T clean URL yet - debug first
      this.token = tokenFromURL;
      localStorage.setItem('auth_token', tokenFromURL);
      console.log('🔍 DEBUG - Legacy token stored:', {
        tokenLength: tokenFromURL.length,
        email: emailFromURL,
        tokenStart: tokenFromURL.substring(0, 20)
      });
      
      // Delay URL cleaning to ensure everything works first
      setTimeout(() => {
        console.log('🧹 Cleaning legacy URL parameters after delay');
        this.cleanURL();
      }, 2000);
      
      // Set user info from URL params
      this.user = { 
        email: emailFromURL, 
        tier: tierFromURL || 'trial',
        id: userIdFromURL,
        profile: { first_name: nameFromURL }
      };
      
      console.log('👤 User authenticated via legacy method:', this.user);
      return true;
    }
    
    // Fallback to localStorage token (for returning users)
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      console.log('📱 Using stored token');
      console.log('🔍 DEBUG - Stored token info:', {
        tokenLength: storedToken.length,
        tokenStart: storedToken.substring(0, 20)
      });
      this.token = storedToken;
      
      // Try to get user info from API, but don't fail
      try {
        const isValid = await this.validateToken();
        if (isValid) {
          console.log('✅ Stored token validated successfully');
        } else {
          console.warn('⚠️ Stored token invalid, but continuing anyway');
          this.user = { email: 'unknown', tier: 'trial' };
        }
      } catch (error) {
        console.warn('⚠️ Token validation failed, using minimal user info:', error);
        this.user = { email: 'unknown', tier: 'trial' };
      }
      
      return true;
    }
    
    // Only redirect if we have absolutely nothing to work with AND we haven't just come from login
    const preventRedirect = sessionStorage.getItem('prevent_auth_redirect') === 'true';
    
    if (preventRedirect) {
      console.warn('⚠️ No auth info found, but preventing redirect to avoid loop. Using minimal session.');
      // Provide a minimal session to keep dashboard functional
      this.user = { email: 'guest', tier: 'trial' };
      return true;
    }
    
    console.warn('❌ No authentication information found at all');
    console.warn('🔍 DEBUG - URL params check failed:');
    console.warn('  - tokenFromURL:', !!tokenFromURL, tokenFromURL?.substring(0, 20));
    console.warn('  - emailFromURL:', emailFromURL);
    console.warn('  - storedToken:', !!localStorage.getItem('auth_token'));
    console.warn('  - preventRedirect flag:', preventRedirect);
    console.warn('  - Current URL:', window.location.href);
    
    this.redirectToLogin('No authentication token found');
    return false;
  }

  /**
   * Set authentication token and store in localStorage
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('auth_token', token);
    
    // Also set in a cookie for API requests
    document.cookie = `auth_token=${token}; path=/; max-age=86400; secure; samesite=strict`;
  }

  /**
   * Remove authentication token and clear session
   */
  clearToken() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    
    // Clear cookie
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }

  /**
   * Clean URL parameters after extracting token or handoff
   */
  cleanURL() {
    const url = new URL(window.location);
    url.searchParams.delete('token');
    url.searchParams.delete('email');
    url.searchParams.delete('name');
    url.searchParams.delete('tier');
    url.searchParams.delete('new');
    url.searchParams.delete('userId');
    url.searchParams.delete('handoff'); // Remove secure handoff parameter
    url.hash = ''; // Remove client-side auth handoff fragment
    
    window.history.replaceState({}, document.title, url);
  }

  /**
   * Validate current token with the server
   */
  async validateToken() {
    try {
      const response = await fetch(`${this.baseURL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        this.user = result.data.user;
        console.log('Token validation successful:', this.user.email);
        return true;
      } else {
        console.error('Token validation failed:', response.status, response.statusText);
        // Log response details for debugging
        const errorText = await response.text().catch(() => 'Unable to read error');
        console.error('Error response:', errorText);
        return false;
      }
    } catch (error) {
      console.error('Token validation network error:', error);
      throw error; // Re-throw to be handled by caller
    }
  }

  /**
   * Set up periodic token validation (every 30 minutes)
   */
  setupTokenValidation() {
    setInterval(async () => {
      try {
        const isValid = await this.validateToken();
        if (!isValid) {
          console.warn('⚠️ Periodic token validation failed - session may have expired, but continuing');
          // Never automatically redirect - let user continue working
        }
      } catch (error) {
        console.warn('⚠️ Periodic token validation error, but continuing:', error);
        // Never redirect on API failures - dashboard should remain functional
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  /**
   * Redirect to login page with optional message
   */
  redirectToLogin(message = '') {
    // CRITICAL: Check if we should prevent redirect to avoid infinite loops
    const preventRedirect = sessionStorage.getItem('prevent_auth_redirect') === 'true';
    
    if (preventRedirect) {
      console.warn('🚨 REDIRECT BLOCKED: Preventing potential infinite loop to login.html');
      console.warn('🚨 Reason:', message);
      console.warn('🚨 Dashboard will continue with limited functionality');
      return; // Don't redirect
    }
    
    // Additional safety: Check if we're already on the login page
    if (window.location.href.includes('login.html')) {
      console.warn('🚨 REDIRECT BLOCKED: Already on login page, preventing loop');
      return;
    }
    
    this.clearToken();
    
    const loginURL = new URL('https://postdoserx.com/login.html');
    loginURL.searchParams.set('redirect', window.location.origin);
    
    if (message) {
      console.log('Redirecting to login:', message);
    }
    
    window.location.href = loginURL.toString();
  }

  /**
   * Make authenticated API requests
   * Use this instead of fetch() for API calls that require authentication
   */
  async authenticatedFetch(url, options = {}) {
    if (!this.token) {
      throw new Error('No authentication token available');
    }

    // Add authentication header
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      ...options.headers
    };

    const response = await fetch(url.startsWith('http') ? url : `${this.baseURL}${url}`, {
      ...options,
      headers
    });

    // Handle authentication errors - but don't auto-redirect anymore
    if (response.status === 401) {
      console.warn('⚠️ API authentication failed, but not redirecting automatically:', url);
      throw new Error('Authentication failed - please refresh the page if needed');
    }

    if (response.status === 403) {
      // Permission denied - possibly tier restriction
      console.warn('⚠️ API access denied:', url);
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || 'Access denied');
    }

    return response;
  }

  /**
   * Get current user information
   */
  getUser() {
    return this.user;
  }

  /**
   * Check if user has specific tier access
   */
  hasTierAccess(requiredTier) {
    if (!this.user) return false;
    
    const tierHierarchy = { trial: 0, premium: 1 };
    const userTierLevel = tierHierarchy[this.user.tier] || 0;
    const requiredTierLevel = tierHierarchy[requiredTier] || 0;
    
    return userTierLevel >= requiredTierLevel;
  }

  /**
   * Logout user and redirect to main site
   */
  logout() {
    this.clearToken();
    // Clear redirect prevention when explicitly logging out
    sessionStorage.removeItem('prevent_auth_redirect');
    window.location.href = 'https://postdoserx.com';
  }

  /**
   * Clear the redirect prevention flag (for testing/debugging)
   */
  clearRedirectPrevention() {
    sessionStorage.removeItem('prevent_auth_redirect');
    console.log('🔓 Redirect prevention cleared - normal redirects will work again');
  }
}

// Create global instance
const dashboardAuth = new DashboardAuth();

/**
 * Initialize dashboard authentication
 * Call this function when your dashboard page loads
 */
async function initializeDashboardAuth() {
  const isAuthenticated = await dashboardAuth.init();
  
  if (isAuthenticated) {
    // Set up periodic token validation (non-disruptive)
    dashboardAuth.setupTokenValidation();
    
    // Dispatch custom event for other scripts to listen to
    window.dispatchEvent(new CustomEvent('dashboardAuthReady', {
      detail: { user: dashboardAuth.getUser() }
    }));
    
    console.log('🎉 Dashboard authentication fully initialized');
  }
  
  return isAuthenticated;
}

/**
 * Make authenticated API requests
 * Use this function for all API calls from the dashboard
 */
function authenticatedFetch(url, options = {}) {
  return dashboardAuth.authenticatedFetch(url, options);
}

/**
 * Get current authenticated user
 */
function getCurrentUser() {
  return dashboardAuth.getUser();
}

/**
 * Check if user has tier access
 */
function hasTierAccess(tier) {
  return dashboardAuth.hasTierAccess(tier);
}

/**
 * Logout current user
 */
function logout() {
  dashboardAuth.logout();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeDashboardAuth,
    authenticatedFetch,
    getCurrentUser,
    hasTierAccess,
    logout
  };
}

// Example usage in your dashboard HTML:
/*
<!DOCTYPE html>
<html>
<head>
    <script src="https://postdoserx.com/dashboard-auth.js"></script>
</head>
<body>
    <script>
        // Initialize authentication when page loads
        window.addEventListener('DOMContentLoaded', async () => {
            const isAuthenticated = await initializeDashboardAuth();
            
            if (isAuthenticated) {
                const user = getCurrentUser();
                console.log('Authenticated user:', user);
                
                // Load user-specific data
                loadDashboardData();
            }
        });
        
        // Listen for auth ready event
        window.addEventListener('dashboardAuthReady', (event) => {
            console.log('Dashboard auth ready for user:', event.detail.user);
        });
        
        // Example API call
        async function loadSymptomLogs() {
            try {
                const response = await authenticatedFetch('/symptoms');
                const data = await response.json();
                
                if (data.success) {
                    displaySymptomLogs(data.data);
                }
            } catch (error) {
                console.error('Failed to load symptom logs:', error);
            }
        }
        
        // Example tier check
        function showPremiumFeature() {
            if (hasTierAccess('premium')) {
                document.getElementById('premium-feature').style.display = 'block';
            } else {
                document.getElementById('upgrade-prompt').style.display = 'block';
            }
        }
    </script>
</body>
</html>
*/