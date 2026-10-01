const { getSupabase, json, CORS_HEADERS } = require('./_lib');

// All requests need ?key=YOUR_ADMIN_KEY (same key as get-bookings).
//
// GET                          -> list every car, including inactive ones
// POST   { name, daily_rate, seats, transmission, fuel, photo_url }
//                               -> add a new car
// PUT    { id, ...fields }     -> update an existing car (only send fields you're changing)
// DELETE ?id=...               -> permanently remove a car
//         (prefer PUT { id, active:false } instead, to keep booking history intact)
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS };

  const key = event.queryStringParameters?.key;
  if (!key || key !== process.env.ADMIN_KEY) return json(401, { error: 'Unauthorized' });

  const supabase = getSupabase();

  if (event.httpMethod === 'GET') {
    const { data, error } = await supabase.from('fleet').select('*').order('sort_order');
    if (error) return json(500, { error: error.message });
    return json(200, { fleet: data });
  }

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}');
    if (!body.name || !body.daily_rate) return json(400, { error: 'name and daily_rate are required' });
    const { data, error } = await supabase.from('fleet').insert(body).select().single();
    if (error) return json(500, { error: error.message });
    return json(200, { car: data });
  }

  if (event.httpMethod === 'PUT') {
    const body = JSON.parse(event.body || '{}');
    if (!body.id) return json(400, { error: 'id is required' });
    const { id, ...fields } = body;
    const { data, error } = await supabase.from('fleet').update(fields).eq('id', id).select().single();
    if (error) return json(500, { error: error.message });
    return json(200, { car: data });
  }

  if (event.httpMethod === 'DELETE') {
    const id = event.queryStringParameters?.id;
    if (!id) return json(400, { error: 'id is required' });
    const { error } = await supabase.from('fleet').delete().eq('id', id);
    if (error) return json(500, { error: error.message });
    return json(200, { deleted: true });
  }

  return json(405, { error: 'Method not allowed' });
};
