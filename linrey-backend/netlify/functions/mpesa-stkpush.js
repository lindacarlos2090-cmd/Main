const { getSupabase, json, CORS_HEADERS } = require('./_lib');

// Set MPESA_ENV=production once you have live (not sandbox) Daraja credentials.
const BASE_URL = process.env.MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

async function getAccessToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');

  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error('Could not get M-Pesa access token');
  const data = await res.json();
  return data.access_token;
}

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// POST { bookingId }  ->  { checkoutRequestId }
// The phone number and amount are pulled from the booking already saved in
// create-booking, not taken again from the request — never trust the client
// for the amount that gets charged.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const { bookingId } = JSON.parse(event.body || '{}');
  if (!bookingId) return json(400, { error: 'bookingId is required' });

  const supabase = getSupabase();
  const { data: booking, error } = await supabase
    .from('bookings').select('*').eq('id', bookingId).single();
  if (error || !booking) return json(404, { error: 'Booking not found' });

  try {
    const token = await getAccessToken();
    const ts = timestamp();
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString('base64');

    // Safaricom expects the phone as 2547XXXXXXXX with no "+".
    const phone = booking.phone.replace(/^\+/, '');

    const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: ts,
        TransactionType: 'CustomerPayBillOnline',
        Amount: booking.total,
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL, // e.g. https://yoursite.netlify.app/.netlify/functions/mpesa-callback
        AccountReference: `LynRey-${booking.id.slice(0, 8)}`,
        TransactionDesc: `${booking.car} rental`,
      }),
    });

    const result = await res.json();
    if (!res.ok || !result.CheckoutRequestID) {
      return json(502, { error: result.errorMessage || 'STK push failed' });
    }

    await supabase.from('bookings')
      .update({ checkout_request_id: result.CheckoutRequestID })
      .eq('id', bookingId);

    return json(200, { checkoutRequestId: result.CheckoutRequestID });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
