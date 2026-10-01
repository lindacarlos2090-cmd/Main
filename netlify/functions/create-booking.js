const { getSupabase, getRate, daysBetween, overlaps, json, CORS_HEADERS } = require('./_lib');

// POST { car, name, phone, pickup, return }
// -> { bookingId, total }   (booking is saved with status "pending" until M-Pesa confirms it)
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const { car, name, phone, pickup, return: returnDate } = JSON.parse(event.body || '{}');
  if (!car || !name || !phone || !pickup || !returnDate) {
    return json(400, { error: 'car, name, phone, pickup and return dates are required' });
  }

  const supabase = getSupabase();

  const rate = await getRate(supabase, car);
  if (!rate) return json(400, { error: 'That vehicle is not currently available to book' });

  // Re-check availability server-side — never trust the browser's own check.
  const { data: existing, error: fetchErr } = await supabase
    .from('bookings')
    .select('pickup, return_date')
    .eq('car', car)
    .neq('status', 'cancelled');
  if (fetchErr) return json(500, { error: fetchErr.message });

  const clash = existing.some(b => overlaps(pickup, returnDate, b.pickup, b.return_date));
  if (clash) return json(409, { error: 'Those dates are no longer available for this car' });

  const total = daysBetween(pickup, returnDate) * rate;

  const { data, error } = await supabase
    .from('bookings')
    .insert({ car, customer_name: name, phone, pickup, return_date: returnDate, total, status: 'pending' })
    .select('id')
    .single();

  if (error) return json(500, { error: error.message });
  return json(200, { bookingId: data.id, total });
};
