-- Run this in Supabase SQL Editor, same way as schema.sql earlier.

create table if not exists public.fleet (
  id            uuid primary key default extensions.gen_random_uuid(),
  name          text not null unique,       -- shown to customers, and used to match bookings
  daily_rate    numeric not null,
  seats         int not null default 5,
  transmission  text not null default 'Automatic',
  fuel          text not null default 'Petrol',
  photo_url     text,                       -- a Supabase Storage public URL, or "assets/whatever.jpg"
  active        boolean not null default true,   -- inactive cars are hidden from the site but kept in history
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.fleet enable row level security;

-- Seed the 3 cars already on the site so nothing breaks when you switch over.
insert into public.fleet (name, daily_rate, seats, transmission, fuel, photo_url, sort_order)
values
  ('Mazda CX-5', 7000, 5, 'Automatic', 'Petrol', 'assets/mazda.jpg', 1),
  ('Toyota Prado TX', 12000, 5, 'Automatic', 'Petrol', 'assets/tx.jpg', 2),
  ('Toyota Prado TXL', 15000, 5, 'Automatic', 'Petrol', 'assets/txl.jpeg', 3)
on conflict (name) do nothing;

select * from public.fleet order by sort_order;
