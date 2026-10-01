const { createClient } = require('@supabase/supabase-js');

// SUPABASE_URL and SUPABASE_SERVICE_KEY are set in Netlify's environment
// variables (Site settings -> Environment variables), never committed to code.
// The service key bypasses Row Level Security, which is fine here because
// only these serverless functions use it — the browser never sees it.
function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

// Fleet pricing now lives in the "fleet" table (managed from the dashboard),
// not hardcoded here — this looks it up fresh each time so a price change
// takes effect immediately with no redeploy.
async function getRate(supabase, carName) {
  const { data, error } = await supabase
    .from('fleet').select('daily_rate, active').eq('name', carName).single();
  if (error || !data || !data.active) return null;
  return data.daily_rate;
}

function daysBetween(a, b) {
  const d = (new Date(b) - new Date(a)) / 86400000;
  return Math.max(1, Math.round(d));
}

// Two date ranges overlap if each one starts before the other ends.
function overlaps(startA, endA, startB, endB) {
  return new Date(startA) < new Date(endB) && new Date(startB) < new Date(endA);
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify(body),
  };
}

module.exports = { getSupabase, getRate, daysBetween, overlaps, CORS_HEADERS, json };
