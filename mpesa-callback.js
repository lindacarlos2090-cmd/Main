const { getSupabase, json } = require('./_lib');

// Safaricom calls this URL directly (server-to-server) once the customer
// approves or cancels the STK push on their phone — the browser is never
// involved in this step, which is exactly why it can be trusted.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const body = JSON.parse(event.body || '{}');
  const stkCallback = body?.Body?.stkCallback;
  if (!stkCallback) return json(400, { error: 'Unexpected callback shape' });

  const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;
  const supabase = getSupabase();

  if (ResultCode === 0) {
    const items = CallbackMetadata?.Item || [];
    const receipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value || null;

    await supabase.from('bookings')
      .update({ status: 'paid', mpesa_receipt: receipt })
      .eq('checkout_request_id', CheckoutRequestID);
  } else {
    // Customer cancelled, entered wrong PIN, timed out, etc.
    await supabase.from('bookings')
      .update({ status: 'failed' })
      .eq('checkout_request_id', CheckoutRequestID);
  }

  // Safaricom just needs a 200 OK acknowledging receipt.
  return json(200, { ResultCode: 0, ResultDesc: 'Accepted' });
};
