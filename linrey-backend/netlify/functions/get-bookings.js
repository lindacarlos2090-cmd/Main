const { getSupabase, json, CORS_HEADERS } = require('./_lib');

// GET ?key=YOUR_ADMIN_KEY  ->  full list of bookings, newest first
// This is the only function that hands back everyone's bookings, so it's
// gated behind ADMIN_KEY (set in Netlify env vars) instead of being open
// like the others. Change ADMIN_KEY to something long and random.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS };

  const key = event.queryStringParameters?.key;
  if (!key || key !== process.env.ADMIN_KEY) {
    return json(401, { error: 'Unauthorized' });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return json(500, { error: error.message });
  return json(200, { bookings: data });
};
