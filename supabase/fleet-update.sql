-- Run this in Supabase SQL Editor. It:
--  1. Adds a "photos" column so each car can have multiple photos, not just one
--  2. Removes the old single "Mazda CX-5" and "Toyota Prado TXL" entries
--  3. Adds two separate CX-5 listings (Black and White) with real photos
--  4. Leaves Toyota Prado TX exactly as it is

alter table public.fleet add column if not exists photos jsonb default '[]'::jsonb;
alter table public.fleet add column if not exists video_url text;

-- Remove the old generic Mazda CX-5 and the Prado TXL (per your request to
-- drop TXL and split CX-5 into two separate color listings).
delete from public.fleet where name in ('Mazda CX-5', 'Toyota Prado TXL');

-- Add the two CX-5 listings with their real photos.
insert into public.fleet (name, daily_rate, seats, transmission, fuel, photo_url, photos, video_url, sort_order)
values
  (
    'Mazda CX-5 (Black)', 7000, 5, 'Automatic', 'Petrol',
    'assets/cx5-black-1.jpg',
    '["assets/cx5-black-1.jpg", "assets/cx5-black-2.jpg", "assets/cx5-black-3.jpg"]'::jsonb,
    'assets/cx5-black-video.mp4',
    1
  ),
  (
    'Mazda CX-5 (White)', 7000, 5, 'Automatic', 'Petrol',
    'assets/cx5-white-1.jpg',
    '["assets/cx5-white-1.jpg", "assets/cx5-white-2.jpg", "assets/cx5-white-3.jpg"]'::jsonb,
    null,
    2
  )
on conflict (name) do update set
  photo_url = excluded.photo_url,
  photos = excluded.photos,
  video_url = excluded.video_url;

-- Give Prado TX its own photos array too (just its existing single photo),
-- so every car uses the same gallery format going forward.
update public.fleet
set photos = '["assets/tx.jpg"]'::jsonb, sort_order = 3
where name = 'Toyota Prado TX';

select name, daily_rate, photos, sort_order, active from public.fleet order by sort_order;
