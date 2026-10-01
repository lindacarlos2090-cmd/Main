const { getSupabase, json, CORS_HEADERS } = require('./_lib');

// GET -> list of active cars, for the public website to render.
// No admin key needed — this is meant to be public, like a menu.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('fleet')
    .select('id, name, daily_rate, seats, transmission, fuel, photo_url, photos, video_url')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) return json(500, { error: error.message });
  return json(200, { fleet: data });
};
