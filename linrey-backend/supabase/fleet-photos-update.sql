-- Run this in Supabase SQL Editor to add the new photos to the existing
-- CX-5 listings. Prices and other details are left unchanged.

update public.fleet
set photos = '["assets/cx5-black-1.jpg", "assets/cx5-black-2.jpg", "assets/cx5-black-3.jpg", "assets/cx5-black-4.jpg", "assets/cx5-black-5.jpg", "assets/cx5-black-6.jpg", "assets/cx5-black-7.jpg", "assets/cx5-black-8.jpg", "assets/cx5-black-9.jpg", "assets/cx5-black-10.jpg", "assets/cx5-black-11.jpg", "assets/cx5-black-12.jpg", "assets/cx5-black-13.jpg"]'::jsonb
where name = 'Mazda CX-5 (Black)';

update public.fleet
set photos = '["assets/cx5-white-1.jpg", "assets/cx5-white-2.jpg", "assets/cx5-white-3.jpg", "assets/cx5-white-4.jpg"]'::jsonb
where name = 'Mazda CX-5 (White)';

select name, photos from public.fleet order by sort_order;
