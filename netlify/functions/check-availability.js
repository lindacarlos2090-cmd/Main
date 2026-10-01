const { getSupabase, overlaps, json, CORS_HEADERS } = require('./_lib');

// POST { car, pickup, return }  ->  { available: true|false }
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const { car, pickup, return: returnDate } = JSON.parse(event.body || '{}');
  if (!car || !pickup || !returnDate) {
    return json(400, { error: 'car, pickup and return dates are required' });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('bookings')
    .select('pickup, return_date')
    .eq('car', car)
    .neq('status', 'cancelled');

  if (error) return json(500, { error: error.message });

  const clash = data.some(b => overlaps(pickup, returnDate, b.pickup, b.return_date));
  return json(200, { available: !clash });
};
