-- TERRA UTSAV: core schema
-- Tables, types, constraints and indexes. Row level security is enabled in 20261018000300.

-- ------------------------------------------------------------------ types
create type public.app_role as enum ('staff', 'admin');
create type public.product_availability as enum ('available', 'sold_out', 'coming_soon', 'hidden');
create type public.member_kind as enum ('student', 'mentor');
create type public.attempt_status as enum ('in_progress', 'won', 'lost', 'void');
create type public.level_outcome as enum ('passed', 'failed_time', 'failed_lives', 'invalid', 'abandoned');
create type public.coupon_status as enum ('issued', 'redeemed', 'void');

-- ------------------------------------------------------------------ helpers
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ------------------------------------------------------------------ people and roles
-- One row per signed-in student, created by a trigger on auth.users. Holds as little as possible.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text check (display_name is null or char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Staff and admin rights. Never derived from a user-editable field; changed only by admins
-- through public.admin_set_role() or by the project owner in the SQL editor.
create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ------------------------------------------------------------------ site configuration
-- Three JSON documents edited from /admin: 'event', 'rewards', 'game'.
create table public.site_settings (
  key text primary key check (key in ('event', 'rewards', 'game')),
  value jsonb not null check (jsonb_typeof(value) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

-- ------------------------------------------------------------------ menu
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name text not null check (char_length(name) between 1 and 80),
  -- 'food' for the counter, 'diyas' for the homemade Diwali diyas section.
  category text not null default 'food' check (category in ('food', 'diyas')),
  tagline text check (tagline is null or char_length(tagline) <= 80),
  description text not null default '' check (char_length(description) <= 600),
  price_paise integer check (price_paise is null or price_paise between 0 and 10000000),
  price_note text check (price_note is null or char_length(price_note) <= 80),
  availability public.product_availability not null default 'coming_soon',
  featured boolean not null default false,
  featured_label text check (featured_label is null or char_length(featured_label) <= 30),
  image_url text check (image_url is null or char_length(image_url) <= 500),
  image_alt text not null default '' check (char_length(image_alt) <= 200),
  image_is_illustrative boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_sort_idx on public.products (category, sort_order, name);
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------ team
create table public.team_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name text not null check (char_length(name) between 1 and 60),
  description text check (description is null or char_length(description) <= 240),
  mascot_variant text not null default 'generic'
    check (mascot_variant in ('leader', 'food', 'operations', 'marketing', 'finance', 'games', 'logistics', 'design', 'sales', 'mentor', 'generic')),
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger team_groups_touch before update on public.team_groups
  for each row execute function public.touch_updated_at();

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name text not null check (char_length(name) between 1 and 80),
  title text not null check (char_length(title) between 1 and 80),
  group_id uuid references public.team_groups (id) on delete set null,
  kind public.member_kind not null default 'student',
  photo_url text check (photo_url is null or char_length(photo_url) <= 500),
  -- A photo is only published once the person has agreed to it.
  photo_consent boolean not null default false,
  mascot_url text check (mascot_url is null or char_length(mascot_url) <= 500),
  mascot_variant text
    check (mascot_variant is null or mascot_variant in ('leader', 'food', 'operations', 'marketing', 'finance', 'games', 'logistics', 'design', 'sales', 'mentor', 'generic')),
  bio text check (bio is null or char_length(bio) <= 400),
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index team_members_group_idx on public.team_members (group_id, sort_order);
create index team_members_kind_idx on public.team_members (kind, sort_order);
create trigger team_members_touch before update on public.team_members
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------ game
-- One row per player; locked while an attempt is created so two requests cannot both start one.
create table public.player_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  bonus_attempts smallint not null default 0 check (bonus_attempts between 0 and 10),
  updated_at timestamptz not null default now()
);

create table public.game_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_number smallint not null check (attempt_number between 1 and 50),
  status public.attempt_status not null default 'in_progress',
  current_level smallint not null default 1 check (current_level between 1 and 5),
  -- The settings in force when the attempt began, so later admin edits cannot change its rules.
  settings_snapshot jsonb not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (user_id, attempt_number)
);
-- At most one unfinished attempt per player.
create unique index game_attempts_one_active_idx on public.game_attempts (user_id) where status = 'in_progress';
create index game_attempts_user_idx on public.game_attempts (user_id, started_at desc);
create index game_attempts_status_idx on public.game_attempts (status);

create table public.game_attempt_levels (
  attempt_id uuid not null references public.game_attempts (id) on delete cascade,
  level smallint not null check (level between 1 and 5),
  seed bigint not null check (seed between 0 and 2147483647),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  outcome public.level_outcome,
  catches smallint check (catches is null or catches >= 0),
  decoy_hits smallint check (decoy_hits is null or decoy_hits >= 0),
  taps smallint check (taps is null or taps >= 0),
  game_time_ms integer check (game_time_ms is null or game_time_ms >= 0),
  server_elapsed_ms integer,
  flags jsonb not null default '{}'::jsonb,
  primary key (attempt_id, level)
);

-- ------------------------------------------------------------------ rewards
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  -- Crockford base32 without I, L, O, U. Generated on the server by public.generate_coupon_code().
  code text not null unique check (code ~ '^TU-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- One coupon per winning attempt, enforced by the database.
  attempt_id uuid not null unique references public.game_attempts (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  value_text text check (value_text is null or char_length(value_text) <= 120),
  status public.coupon_status not null default 'issued',
  max_redemptions smallint not null default 1 check (max_redemptions between 1 and 10),
  redemption_count smallint not null default 0 check (redemption_count >= 0),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  last_redeemed_at timestamptz,
  check (redemption_count <= max_redemptions)
);
create index coupons_user_idx on public.coupons (user_id, issued_at desc);
create index coupons_status_idx on public.coupons (status);

create table public.coupon_redemptions (
  id bigint generated always as identity primary key,
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  redeemed_by uuid references auth.users (id) on delete set null,
  redeemed_at timestamptz not null default now(),
  note text check (note is null or char_length(note) <= 200)
);
create index coupon_redemptions_coupon_idx on public.coupon_redemptions (coupon_id);
create index coupon_redemptions_staff_idx on public.coupon_redemptions (redeemed_by, redeemed_at desc);

-- ------------------------------------------------------------------ brick challenge (staff-recorded)
create table public.challenge_results (
  id bigint generated always as identity primary key,
  participant_label text check (participant_label is null or char_length(participant_label) <= 40),
  held_seconds smallint not null check (held_seconds between 0 and 60),
  completed boolean not null,
  recorded_by uuid references auth.users (id) on delete set null,
  recorded_at timestamptz not null default now()
);
create index challenge_results_recorded_idx on public.challenge_results (recorded_at desc);

-- ------------------------------------------------------------------ audit and abuse protection
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null check (char_length(action) <= 60),
  entity text not null check (char_length(entity) <= 60),
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

create table public.rate_limits (
  key text not null check (char_length(key) <= 120),
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
