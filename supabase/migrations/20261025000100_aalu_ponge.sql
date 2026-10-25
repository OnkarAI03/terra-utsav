-- 2026-10-25: Aalu Ponge replaces Chat Papdi, and Catch Mini winners get a prize from the team (no discount). Safe to run more than once.
--
-- Name, photo and description supplied by the team. The row keeps its id, price, availability
-- and sort order, so anything set from /admin/menu stays. The photo stays marked illustrative
-- until the team confirms it shows the stall's own Aalu Ponge.

update public.products
set slug = 'aalu-ponge',
    name = 'Aalu Ponge',
    tagline = 'Crispy. Spicy. Loaded.',
    description = 'Crispy, spicy & absolutely loaded with flavour — this Aalu Ponge is the kind of street food you''ll keep craving! 🤤🥔 Perfectly crispy outside, soft & flavourful inside.',
    image_url = '/images/food/aalu-ponge.webp',
    image_alt = 'Aalu Ponge rolls topped with crunchy sev and fresh coriander',
    image_is_illustrative = true
where slug = 'chat-papdi'
  and not exists (select 1 from public.products where slug = 'aalu-ponge');

-- 2026-10-25: no discount for Catch Mini winners any more; they collect a prize from the team.
update public.site_settings
set value = jsonb_set(value, '{couponValueText}', 'null'::jsonb),
    updated_at = now()
where key = 'rewards' and value ->> 'couponValueText' = '50% off a Chocolate Bomb';
