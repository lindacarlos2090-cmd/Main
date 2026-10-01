-- Run this once in your Supabase project's SQL editor
-- (Supabase dashboard -> SQL Editor -> New query -> paste all of this -> Run)
--
-- Note: CREATE TABLE and CREATE EXTENSION don't return any rows when they
-- succeed - Supabase will just show "Success. No rows returned." That is
-- normal, not an error. The SELECT at the very end of this file is what
-- will show you a visible result confirming everything worked.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.bookings (
  id             uuid primary key default extensions.gen_random_uuid(),
  car            text not null,
  customer_name  text not null,
  phone          text not null,
  pickup         date not null,
  return_date    date not null,
  total          numeric not null,
  status         text not null default 'pending',  -- pending | paid | cancelled | failed
  checkout_request_id text,   -- Safaricom's ID for the STK push, used to match the callback
  mpesa_receipt  text,        -- filled in once Safaricom confirms payment
  created_at     timestamptz not null default now()
);

-- Speeds up the availability check (same car, overlapping dates)
create index if not exists bookings_car_dates_idx on public.bookings (car, pickup, return_date);

-- Row Level Security stays ON with no policies: only the Netlify functions
-- (using the service role key, which bypasses RLS) can read or write.
-- The browser never talks to Supabase directly, so nothing needs to be public.
alter table public.bookings enable row level security;

-- Verification - if this runs and shows a table with the right column
-- names below, the schema was created successfully.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'bookings'
order by ordinal_position;
