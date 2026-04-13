/**
 * Simple health check endpoint for dashboard authentication testing
 * This helps verify that the dashboard can communicate with this API
 */
export default async function handler(req, res) {
  // Set CORS headers for dashboard subdomain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  const timestamp = new Date().toISOString();
  
  res.status(200).json({
    success: true,
    message: 'PostDoseRX API is healthy',
    timestamp,
    environment: process.env.NODE_ENV || 'unknown',
    dashboardAuthUrl: 'https://postdoserx.com/dashboard-auth.js',
    authApiUrl: 'https://postdoserx.com/api/auth',
    instructions: {
      dashboard: 'Load dashboard-auth.js from https://postdoserx.com/dashboard-auth.js',
      initialize: 'Call initializeDashboardAuth() immediately on page load',
      tokens: 'Read token and email from URL query parameters first',
      validation: 'Use authenticatedFetch() for API calls with JWT tokens'
    }
  });
}