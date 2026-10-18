-- TERRA UTSAV: row level security
--
-- Principles:
--  * Every table has RLS on. No table is writable by students.
--  * Students can read only their own profile, attempts, levels and coupons.
--  * Staff work through coupon_lookup / coupon_redeem / challenge_results only.
--  * Admin rights come from public.user_roles, checked by public.is_admin().
--  * Game state is written only by SECURITY DEFINER functions called by the server.

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.site_settings enable row level security;
alter table public.products enable row level security;
alter table public.team_groups enable row level security;
alter table public.team_members enable row level security;
alter table public.player_state enable row level security;
alter table public.game_attempts enable row level security;
alter table public.game_attempt_levels enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.challenge_results enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limits enable row level security;

-- ------------------------------------------------------------------ profiles
create policy "profiles: owner reads" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: admins read" on public.profiles
  for select to authenticated using ((select public.is_admin()));
create policy "profiles: owner updates" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Only the display name is editable by its owner; email and ids are not.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- ------------------------------------------------------------------ roles (read-only from the API)
create policy "roles: owner reads" on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "roles: admins read" on public.user_roles
  for select to authenticated using ((select public.is_admin()));
revoke insert, update, delete on public.user_roles from anon, authenticated;

-- ------------------------------------------------------------------ site settings
create policy "settings: everyone reads" on public.site_settings
  for select to anon, authenticated using (true);
create policy "settings: admins insert" on public.site_settings
  for insert to authenticated with check ((select public.is_admin()));
create policy "settings: admins update" on public.site_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
revoke insert, update, delete on public.site_settings from anon;
revoke delete on public.site_settings from authenticated;

-- ------------------------------------------------------------------ products
create policy "products: everyone reads listed" on public.products
  for select to anon, authenticated using (availability <> 'hidden' or (select public.is_admin()));
create policy "products: admins insert" on public.products
  for insert to authenticated with check ((select public.is_admin()));
create policy "products: admins update" on public.products
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "products: admins delete" on public.products
  for delete to authenticated using ((select public.is_admin()));
revoke insert, update, delete on public.products from anon;

-- ------------------------------------------------------------------ team
create policy "team groups: everyone reads visible" on public.team_groups
  for select to anon, authenticated using (visible or (select public.is_admin()));
create policy "team groups: admins insert" on public.team_groups
  for insert to authenticated with check ((select public.is_admin()));
create policy "team groups: admins update" on public.team_groups
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "team groups: admins delete" on public.team_groups
  for delete to authenticated using ((select public.is_admin()));
revoke insert, update, delete on public.team_groups from anon;

-- The member table is admin-only. The public reads public.team_members_public, which hides
-- photos without consent and members who are not visible.
create policy "team members: admins read" on public.team_members
  for select to authenticated using ((select public.is_admin()));
create policy "team members: admins insert" on public.team_members
  for insert to authenticated with check ((select public.is_admin()));
create policy "team members: admins update" on public.team_members
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "team members: admins delete" on public.team_members
  for delete to authenticated using ((select public.is_admin()));
revoke insert, update, delete on public.team_members from anon;

create view public.team_members_public as
select
  m.id,
  m.slug,
  m.name,
  m.title,
  m.group_id,
  m.kind,
  case when m.photo_consent then m.photo_url end as photo_url,
  m.mascot_url,
  coalesce(m.mascot_variant, g.mascot_variant, case when m.kind = 'mentor' then 'mentor' else 'generic' end) as mascot_variant,
  m.bio,
  m.links,
  m.sort_order
from public.team_members m
left join public.team_groups g on g.id = m.group_id
where m.visible and (g.id is null or g.visible);

revoke all on public.team_members_public from anon, authenticated;
grant select on public.team_members_public to anon, authenticated;

-- ------------------------------------------------------------------ game (read own, write via functions)
create policy "player state: owner reads" on public.player_state
  for select to authenticated using (user_id = (select auth.uid()));
create policy "player state: admins read" on public.player_state
  for select to authenticated using ((select public.is_admin()));
revoke insert, update, delete on public.player_state from anon, authenticated;

create policy "attempts: owner reads" on public.game_attempts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "attempts: admins read" on public.game_attempts
  for select to authenticated using ((select public.is_admin()));
revoke insert, update, delete on public.game_attempts from anon, authenticated;

create policy "levels: owner reads" on public.game_attempt_levels
  for select to authenticated using (
    exists (select 1 from public.game_attempts a where a.id = attempt_id and a.user_id = (select auth.uid()))
  );
create policy "levels: admins read" on public.game_attempt_levels
  for select to authenticated using ((select public.is_admin()));
revoke insert, update, delete on public.game_attempt_levels from anon, authenticated;

-- ------------------------------------------------------------------ coupons
create policy "coupons: owner reads" on public.coupons
  for select to authenticated using (user_id = (select auth.uid()));
create policy "coupons: admins read" on public.coupons
  for select to authenticated using ((select public.is_admin()));
revoke insert, update, delete on public.coupons from anon, authenticated;

create policy "redemptions: staff read their own" on public.coupon_redemptions
  for select to authenticated using (redeemed_by = (select auth.uid()) and (select public.is_staff()));
create policy "redemptions: admins read" on public.coupon_redemptions
  for select to authenticated using ((select public.is_admin()));
revoke insert, update, delete on public.coupon_redemptions from anon, authenticated;

-- ------------------------------------------------------------------ brick challenge
create policy "challenge: staff record" on public.challenge_results
  for insert to authenticated with check ((select public.is_staff()) and recorded_by = (select auth.uid()));
create policy "challenge: staff read" on public.challenge_results
  for select to authenticated using ((select public.is_staff()));
create policy "challenge: admins delete" on public.challenge_results
  for delete to authenticated using ((select public.is_admin()));
revoke update on public.challenge_results from anon, authenticated;
revoke insert, delete on public.challenge_results from anon;

-- ------------------------------------------------------------------ audit and rate limits
create policy "audit: admins read" on public.audit_log
  for select to authenticated using ((select public.is_admin()));
revoke insert, update, delete on public.audit_log from anon, authenticated;

-- rate_limits: no policies at all; only SECURITY DEFINER functions touch it.
revoke all on public.rate_limits from anon, authenticated;
