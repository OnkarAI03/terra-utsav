-- TERRA UTSAV: the team roster supplied on 2026-10-18. Mirrors src/content/team.ts.
-- Photos come from the team's PDF (page N = person N in roster order) and were supplied for publication
-- on this site, so photo_consent is true. Confirm each person is happy with their photo.
-- Mentors (supplied later the same day) are seeded at the end of this file.

insert into public.team_groups (slug, name, description, mascot_variant, sort_order, visible) values
  ('group-leader', 'Group Leader', null, 'leader', 1, true),
  ('financial-managers', 'Financial Managers', null, 'finance', 2, true),
  ('purchase-inventory', 'Purchase and Inventory', null, 'logistics', 3, true),
  ('product-managers', 'Product Managers', null, 'food', 4, true),
  ('decor-team', 'Decor Team', null, 'design', 5, true),
  ('digital-marketing', 'Digital Marketing, Social Media and Graphics', null, 'marketing', 6, true),
  ('sales-marketing', 'Sales and Marketing', null, 'sales', 7, true)
on conflict (slug) do nothing;

insert into public.team_members (slug, name, title, group_id, kind, photo_url, photo_consent, mascot_url, mascot_variant, bio, links, sort_order, visible)
select v.slug, v.name, v.title, g.id, 'student', v.photo_url, true, null, null, null, '[]'::jsonb, v.sort_order, true
from (values
  ('saniya-bhor', 'Saniya Bhor', 'Group Leader', 'group-leader', '/images/team/member-01-real.webp', 1),
  ('vivek-avhad', 'Vivek Avhad', 'Financial Manager', 'financial-managers', '/images/team/member-02-real.webp', 2),
  ('remanshu-chobi', 'Remanshu Chobi', 'Financial Manager', 'financial-managers', '/images/team/member-03-real.webp', 3),
  ('bhakti-gagare', 'Bhakti Gagare', 'Purchase and Inventory', 'purchase-inventory', '/images/team/member-04-real.webp', 4),
  ('ojaswi-bhoi', 'Ojaswi Bhoi', 'Purchase and Inventory', 'purchase-inventory', '/images/team/member-05-real.webp', 5),
  ('sushant-bodke', 'Sushant Bodke', 'Product Manager', 'product-managers', '/images/team/member-06-real.webp', 6),
  ('sushrut-gajbhiye', 'Sushrut Gajbhiye', 'Product Manager', 'product-managers', '/images/team/member-07-real.webp', 7),
  ('arati-gandale', 'Arati Gandale', 'Product Manager', 'product-managers', '/images/team/member-08-real.webp', 8),
  ('kushal-bhalerao', 'Kushal Bhalerao', 'Decor Team', 'decor-team', '/images/team/member-09-real.webp', 9),
  ('shreya-desai', 'Shreya Desai', 'Decor Team', 'decor-team', '/images/team/member-10-real.webp', 10),
  ('adkine-tejaswini', 'Adkine Tejaswini', 'Decor Team', 'decor-team', '/images/team/member-11-real.webp', 11),
  ('rohan-andhalkar', 'Rohan Andhalkar', 'Digital Marketing, Social Media and Graphics', 'digital-marketing', '/images/team/member-12-real.webp', 12),
  ('satish-diwate', 'Satish Diwate', 'Digital Marketing, Social Media and Graphics', 'digital-marketing', '/images/team/member-13-real.webp', 13),
  ('shraddha-autade', 'Shraddha Autade', 'Digital Marketing, Social Media and Graphics', 'digital-marketing', '/images/team/member-14-real.webp', 14),
  ('supriya-danole', 'Supriya Danole', 'Digital Marketing, Social Media and Graphics', 'digital-marketing', '/images/team/member-15-real.webp', 15),
  ('rushikesh-bhalerao', 'Rushikesh Bhalerao', 'Sales and Marketing', 'sales-marketing', '/images/team/member-16-real.webp', 16),
  ('sanket-wakale', 'Sanket Wakale', 'Sales and Marketing', 'sales-marketing', '/images/team/member-17-real.webp', 17)
) as v (slug, name, title, group_slug, photo_url, sort_order)
join public.team_groups g on g.slug = v.group_slug
on conflict (slug) do nothing;

-- Mentors: first names as supplied, photos from the team's second PDF (page N = mentor N).
insert into public.team_members (slug, name, title, group_id, kind, photo_url, photo_consent, mascot_url, mascot_variant, bio, links, sort_order, visible)
values
  ('ankush', 'Ankush', 'Mentor', null, 'mentor', '/images/team/mentor-01.webp', true, null, 'mentor', null, '[]'::jsonb, 1, true),
  ('jidnyesh', 'Jidnyesh', 'Mentor', null, 'mentor', '/images/team/mentor-02.webp', true, null, 'mentor', null, '[]'::jsonb, 2, true),
  ('sairaj', 'Sairaj', 'Mentor', null, 'mentor', '/images/team/mentor-03.webp', true, null, 'mentor', null, '[]'::jsonb, 3, true)
on conflict (slug) do nothing;
