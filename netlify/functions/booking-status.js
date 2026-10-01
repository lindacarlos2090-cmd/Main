const { getSupabase, json, CORS_HEADERS } = require('./_lib');

// GET ?bookingId=...  ->  { status: "pending"|"paid"|"failed"|"cancelled" }
// The booking page polls this every couple of seconds after triggering the
// STK push, so it can tell the customer once payment actually goes through.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS };

  const bookingId = event.queryStringParameters?.bookingId;
  if (!bookingId) return json(400, { error: 'bookingId is required' });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('bookings').select('status').eq('id', bookingId).single();

  if (error || !data) return json(404, { error: 'Booking not found' });
  return json(200, { status: data.status });
};
