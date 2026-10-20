-- 2026-10-20: a fourth mentor, and the mascot's new name. Safe to run more than once.
--
-- 1. Giriraj joins the mentors (first name as supplied), with the photo supplied the same day,
--    cropped like the others by scripts/assets/mentor_photos.py. It was supplied for publication
--    on this site, so photo_consent is true, as for the other mentors.
-- 2. The kitten mascot, called Koochu Puchu until now, is called Mini. The level blurbs in the
--    game settings name the mascot, so the stored settings are renamed in place and every other
--    value (levels, timings, anything changed from /admin/game) is kept.

insert into public.team_members (slug, name, title, group_id, kind, photo_url, photo_consent, mascot_url, mascot_variant, bio, links, sort_order, visible)
values
  ('giriraj', 'Giriraj', 'Mentor', null, 'mentor', '/images/team/mentor-04.webp', true, null, 'mentor', null, '[]'::jsonb, 4, true)
on conflict (slug) do nothing;

update public.site_settings
set value = replace(value::text, 'Koochu Puchu', 'Mini')::jsonb,
    updated_at = now()
where key = 'game' and value::text like '%Koochu Puchu%';
