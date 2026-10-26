-- 2026-10-26: the team spells it Aloo Ponga. Renames the row from the earlier spelling, keeping
-- its id, price, availability and anything set from /admin/menu; the photo path moves only if it
-- is still the bundled photo. Safe to run more than once.

update public.products
set slug = 'aloo-ponga',
    name = 'Aloo Ponga',
    description = replace(description, 'Aalu Ponge', 'Aloo Ponga'),
    image_url = case when image_url = '/images/food/aalu-ponge.webp' then '/images/food/aloo-ponga.webp' else image_url end,
    image_alt = replace(image_alt, 'Aalu Ponge', 'Aloo Ponga')
where slug = 'aalu-ponge'
  and not exists (select 1 from public.products where slug = 'aloo-ponga');
