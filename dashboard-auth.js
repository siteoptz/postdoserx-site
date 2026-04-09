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

class DashboardAuth {
  constructor() {
    this.token = null;
    this.user = null;
    this.baseURL = 'https://postdoserx.com/api'; // Main API endpoint
  }

  /**
   * Initialize dashboard authentication
   * Checks for token in URL params or localStorage, validates it, and sets up session
   */
  async init() {
    console.log('🚀 Dashboard auth initializing...');
    
    // Check for token in URL parameters (from login redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromURL = urlParams.get('token');
    const emailFromURL = urlParams.get('email');
    const tierFromURL = urlParams.get('tier');
    const userIdFromURL = urlParams.get('userId');
    const nameFromURL = urlParams.get('name');
    
    console.log('📋 URL params:', { 
      hasToken: !!tokenFromURL, 
      email: emailFromURL, 
      tier: tierFromURL, 
      userId: userIdFromURL 
    });
    
    // If we have URL parameters, use them - NEVER redirect
    if (tokenFromURL && emailFromURL) {
      console.log('✅ Found URL parameters, using them directly');
      
      // Store token and clean URL
      this.token = tokenFromURL;
      localStorage.setItem('auth_token', tokenFromURL);
      this.cleanURL();
      
      // Set user info from URL params
      this.user = { 
        email: emailFromURL, 
        tier: tierFromURL || 'trial',
        id: userIdFromURL,
        profile: { first_name: nameFromURL }
      };
      
      console.log('👤 User authenticated:', this.user);
      return true;
    }
    
    // Fallback to localStorage token (for returning users)
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      console.log('📱 Using stored token');
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
    
    // Only redirect if we have absolutely nothing to work with
    console.warn('❌ No authentication information found at all');
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
   * Clean URL parameters after extracting token
   */
  cleanURL() {
    const url = new URL(window.location);
    url.searchParams.delete('token');
    url.searchParams.delete('email');
    url.searchParams.delete('name');
    url.searchParams.delete('tier');
    url.searchParams.delete('new');
    
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
          console.warn('Periodic token validation failed - session may have expired');
          // Don't automatically redirect - let user continue working
        }
      } catch (error) {
        console.warn('Periodic token validation error:', error);
        // Don't redirect on API failures
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  /**
   * Redirect to login page with optional message
   */
  redirectToLogin(message = '') {
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

    // Handle authentication errors
    if (response.status === 401) {
      this.redirectToLogin('Authentication required');
      throw new Error('Authentication failed');
    }

    if (response.status === 403) {
      // Permission denied - possibly tier restriction
      const result = await response.json();
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
    window.location.href = 'https://postdoserx.com';
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
    // Dispatch custom event for other scripts to listen to
    window.dispatchEvent(new CustomEvent('dashboardAuthReady', {
      detail: { user: dashboardAuth.getUser() }
    }));
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