import { supabase } from '../../lib/database.js';
import { verifyJWT } from '../../lib/jwt.js';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
};

export default async function handler(req, res) {
  // Set CORS headers for all requests
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get and verify JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7);
    let payload;
    
    try {
      payload = await verifyJWT(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const userId = payload.userId;

    if (req.method === 'GET') {
      return await getSymptoms(req, res, userId);
    } else if (req.method === 'POST') {
      return await logSymptoms(req, res, userId);
    }

    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });

  } catch (error) {
    console.error('Symptoms API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

async function getSymptoms(req, res, userId) {
  const { from, to, limit = 30 } = req.query;
  
  let query = supabase
    .from('symptom_logs')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: false });

  if (from) {
    query = query.gte('log_date', from);
  }
  if (to) {
    query = query.lte('log_date', to);
  }
  
  query = query.limit(parseInt(limit));

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch symptoms:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch symptoms'
    });
  }

  return res.status(200).json({
    success: true,
    data: data || []
  });
}

async function logSymptoms(req, res, userId) {
  const { logDate, symptoms, note } = req.body;

  if (!logDate || !symptoms) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: logDate and symptoms'
    });
  }

  const { data, error } = await supabase
    .from('symptom_logs')
    .upsert({
      user_id: userId,
      log_date: logDate,
      symptoms: symptoms,
      note: note || null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,log_date'
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to log symptoms:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to log symptoms'
    });
  }

  return res.status(200).json({
    success: true,
    data: data
  });
}