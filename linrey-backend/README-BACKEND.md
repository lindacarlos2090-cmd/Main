# Getting the real backend live

This turns the prototype into a site with a real database and real M-Pesa
payments, instead of everything living in one browser's localStorage.

## 1. Create the Supabase project
1. Go to supabase.com, sign up free, create a new project.
2. In the project, open **SQL Editor -> New query**, paste the contents of
   `supabase/schema.sql`, and run it. This creates the `bookings` table.
3. Go to **Project Settings -> API** and copy:
   - Project URL -> this is `SUPABASE_URL`
   - `service_role` secret key -> this is `SUPABASE_SERVICE_KEY`
   (Never put the service_role key in any file that reaches the browser —
   it only belongs in Netlify's server-side environment variables.)

## 2. Get Safaricom Daraja credentials
1. Register at developer.safaricom.co.ke and create an app under **My Apps**.
2. Start with the **sandbox** shortcode/passkey (already public test values,
   shown on the Daraja docs) to test the flow safely before going live.
3. Once you're ready for real payments, apply for a production paybill/till
   number and swap in the live consumer key/secret/shortcode/passkey, and
   set `MPESA_ENV=production`.

## 3. Deploy to Netlify
1. Push this whole folder to a GitHub repo (or drag-and-drop it like before —
   but functions need Netlify to run `npm install`, so a connected GitHub
   repo is more reliable than Netlify Drop for this step).
2. In Netlify: **Site settings -> Environment variables**, add every
   variable listed in `.env.example` with real values.
3. Deploy. Netlify will install `@supabase/supabase-js` automatically and
   turn each file in `netlify/functions/` into a live endpoint at
   `https://yoursite.netlify.app/.netlify/functions/<name>`.
4. Copy that site's URL, and set `MPESA_CALLBACK_URL` (in Netlify's env
   vars) to `https://yoursite.netlify.app/.netlify/functions/mpesa-callback`,
   then redeploy so the function picks up the new value.

## 4. Set your dashboard admin key
`ADMIN_KEY` in Netlify's env vars can be any long random string you make up.
The first time you open `dashboard.html` after deploying, it will ask you to
enter that same key once and remember it in that browser.

## 5. Test before going live
Use the Daraja **sandbox** test phone number (67891011... — see Daraja docs
for the current one) to run a full booking end to end: create a booking,
approve the sandbox STK push, confirm the booking flips to "Paid" and shows
up on the dashboard. Only switch to production credentials once that works.

## What's still manual
- Cancelling or refunding a booking isn't built yet — that would be a
  reasonable next addition to the dashboard.
- There's no email/SMS confirmation sent to the customer yet, just the
  on-screen confirmation.
