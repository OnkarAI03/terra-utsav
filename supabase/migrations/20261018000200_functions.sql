-- TERRA UTSAV: server-side functions
--
-- Every function that changes game or reward state is SECURITY DEFINER with an empty
-- search_path, checks the caller itself, and does its work in one transaction with row locks so
-- that two simultaneous requests cannot start two attempts, issue two coupons for one win or
-- redeem one coupon twice.

-- ------------------------------------------------------------------ roles
create or replace function public.has_role(p_role public.app_role, p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r where r.user_id = p_user and r.role = p_role
  );
$$;

create or replace function public.is_admin(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin'::public.app_role, p_user);
$$;

-- Admins can do everything staff can.
create or replace function public.is_staff(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = p_user and r.role in ('staff'::public.app_role, 'admin'::public.app_role)
  );
$$;

-- ------------------------------------------------------------------ new users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, lower(new.email))
  on conflict (id) do update set email = excluded.email;
  insert into public.player_state (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------ small utilities
create or replace function public.mask_email(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_email is null or position('@' in p_email) < 2 then null
    else left(p_email, least(2, position('@' in p_email) - 1)) || '***' || substr(p_email, position('@' in p_email))
  end;
$$;

-- Accepts what a person might type ("tu 7k9m2 x4p0d", "TU-7K9M2-X4P0D", lower case, O for 0)
-- and returns the canonical code, or null if it cannot be a valid code.
create or replace function public.normalize_coupon_code(p_input text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text;
begin
  if p_input is null then
    return null;
  end if;
  v := upper(regexp_replace(p_input, '[^0-9A-Za-z]', '', 'g'));
  if left(v, 2) = 'TU' then
    v := substr(v, 3);
  end if;
  v := translate(v, 'OIL', '011');
  if v !~ '^[0-9A-HJKMNP-TV-Z]{10}$' then
    return null;
  end if;
  return 'TU-' || substr(v, 1, 5) || '-' || substr(v, 6, 5);
end;
$$;

-- 50 random bits from the database's cryptographic RNG (gen_random_uuid uses pg_strong_random).
create or replace function public.generate_coupon_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  raw bytea := uuid_send(gen_random_uuid());
  chars text := '';
  idx int;
begin
  -- Bytes 0-5 and 9-12 of a v4 UUID are fully random (6 and 8 carry version/variant bits).
  foreach idx in array array[0, 1, 2, 3, 4, 5, 9, 10, 11, 12] loop
    chars := chars || substr(alphabet, (get_byte(raw, idx) % 32) + 1, 1);
  end loop;
  return 'TU-' || substr(chars, 1, 5) || '-' || substr(chars, 6, 5);
end;
$$;

-- Fixed-window rate limiter shared by every server instance. Returns false when over the limit.
create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;

  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end;
$$;

create or replace function public.write_audit(p_actor uuid, p_action text, p_entity text, p_entity_id text, p_details jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (p_actor, p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb));
$$;

-- Generic audit trigger for admin-managed tables.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_id text := coalesce(v_row ->> 'id', v_row ->> 'key', v_row ->> 'user_id');
  v_details jsonb;
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(n.key, n.value), '{}'::jsonb)
      into v_details
      from jsonb_each(to_jsonb(new)) n
      where n.key not in ('updated_at') and (to_jsonb(old) -> n.key) is distinct from n.value;
  elsif tg_op = 'INSERT' then
    v_details := to_jsonb(new);
  else
    v_details := to_jsonb(old);
  end if;
  perform public.write_audit(auth.uid(), lower(tg_op), tg_table_name, v_id, v_details);
  return coalesce(new, old);
end;
$$;

create trigger audit_products after insert or update or delete on public.products
  for each row execute function public.audit_row_change();
create trigger audit_team_groups after insert or update or delete on public.team_groups
  for each row execute function public.audit_row_change();
create trigger audit_team_members after insert or update or delete on public.team_members
  for each row execute function public.audit_row_change();
create trigger audit_site_settings after insert or update or delete on public.site_settings
  for each row execute function public.audit_row_change();
create trigger audit_user_roles after insert or update or delete on public.user_roles
  for each row execute function public.audit_row_change();
create trigger audit_player_state after update on public.player_state
  for each row execute function public.audit_row_change();

-- ------------------------------------------------------------------ game: attempts
-- Called by the Next.js server (service role) after it has verified the user's session.
create or replace function public.game_start_attempt(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings jsonb;
  v_bonus int;
  v_allowed int;
  v_used int;
  v_next int;
  v_attempt public.game_attempts;
  v_level public.game_attempt_levels;
  v_limit_ms int;
  v_rewards jsonb;
begin
  if p_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Serialise everything below per player.
  insert into public.player_state (user_id) values (p_user) on conflict (user_id) do nothing;
  select bonus_attempts into v_bonus from public.player_state where user_id = p_user for update;

  select value into v_settings from public.site_settings where key = 'game';
  if v_settings is null then
    return jsonb_build_object('error', 'game_not_configured');
  end if;
  v_allowed := coalesce((v_settings ->> 'maxRewardAttempts')::int, 2) + coalesce(v_bonus, 0);

  select * into v_attempt from public.game_attempts
  where user_id = p_user and status = 'in_progress'
  for update;

  if found then
    select * into v_level from public.game_attempt_levels
    where attempt_id = v_attempt.id and level = v_attempt.current_level;

    if found and v_level.submitted_at is null then
      v_limit_ms := coalesce((v_attempt.settings_snapshot ->> 'countdownMs')::int, 3000)
        + coalesce((v_attempt.settings_snapshot -> 'levels' -> (v_level.level - 1) ->> 'durationMs')::int, 30000)
        + 15000;
      if now() - v_level.started_at < make_interval(secs => v_limit_ms / 1000.0) then
        return jsonb_build_object('error', 'level_in_progress');
      end if;
      -- The level was started and abandoned: by the rules the attempt is over.
      update public.game_attempt_levels
        set outcome = 'abandoned', submitted_at = now()
        where attempt_id = v_attempt.id and level = v_level.level;
      update public.game_attempts set status = 'lost', finished_at = now() where id = v_attempt.id;
    else
      select count(*) into v_used from public.game_attempts where user_id = p_user and status <> 'void';
      return jsonb_build_object(
        'resumed', true,
        'attemptId', v_attempt.id,
        'attemptNumber', v_attempt.attempt_number,
        'currentLevel', v_attempt.current_level,
        'attemptsAllowed', v_allowed,
        'attemptsUsed', v_used,
        'settings', v_attempt.settings_snapshot
      );
    end if;
  end if;

  -- Reward play opens only when the organisers have switched coupons on and confirmed the terms,
  -- so nobody spends an attempt on a reward that cannot be issued.
  select value into v_rewards from public.site_settings where key = 'rewards';
  if v_rewards is null
    or coalesce((v_rewards ->> 'rewardsEnabled')::boolean, false) = false
    or coalesce((v_rewards ->> 'confirmed')::boolean, false) = false then
    return jsonb_build_object('error', 'rewards_closed');
  end if;

  -- One coupon per player: a win ends reward play for that account.
  if exists (select 1 from public.game_attempts where user_id = p_user and status = 'won') then
    return jsonb_build_object('error', 'already_won');
  end if;

  select count(*) into v_used from public.game_attempts where user_id = p_user and status <> 'void';
  if v_used >= v_allowed then
    return jsonb_build_object('error', 'no_attempts_left', 'attemptsAllowed', v_allowed, 'attemptsUsed', v_used);
  end if;

  select coalesce(max(attempt_number), 0) + 1 into v_next from public.game_attempts where user_id = p_user;

  insert into public.game_attempts (user_id, attempt_number, settings_snapshot)
  values (p_user, v_next, v_settings)
  returning * into v_attempt;

  return jsonb_build_object(
    'resumed', false,
    'attemptId', v_attempt.id,
    'attemptNumber', v_attempt.attempt_number,
    'currentLevel', v_attempt.current_level,
    'attemptsAllowed', v_allowed,
    'attemptsUsed', v_used + 1,
    'settings', v_attempt.settings_snapshot
  );
end;
$$;

-- ------------------------------------------------------------------ game: levels
create or replace function public.game_start_level(p_user uuid, p_attempt uuid, p_level int, p_seed bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.game_attempts;
  v_level public.game_attempt_levels;
begin
  select * into v_attempt from public.game_attempts where id = p_attempt for update;
  if not found or v_attempt.user_id <> p_user then
    return jsonb_build_object('error', 'attempt_not_found');
  end if;
  if v_attempt.status <> 'in_progress' then
    return jsonb_build_object('error', 'attempt_finished');
  end if;
  if p_level <> v_attempt.current_level then
    return jsonb_build_object('error', 'wrong_level', 'currentLevel', v_attempt.current_level);
  end if;
  if exists (select 1 from public.game_attempt_levels where attempt_id = p_attempt and level = p_level) then
    return jsonb_build_object('error', 'level_already_started');
  end if;

  insert into public.game_attempt_levels (attempt_id, level, seed)
  values (p_attempt, p_level, p_seed)
  returning * into v_level;

  return jsonb_build_object(
    'attemptId', p_attempt,
    'level', p_level,
    'seed', v_level.seed,
    'startedAt', v_level.started_at
  );
end;
$$;

-- The Next.js server replays the player's taps with the shared engine and passes the result here.
-- This function re-checks the order of play and the clock, records the level, advances or ends
-- the attempt, and issues at most one coupon for a win on the final level.
create or replace function public.game_submit_level(
  p_user uuid,
  p_attempt uuid,
  p_level int,
  p_outcome text,
  p_catches int,
  p_decoy_hits int,
  p_taps int,
  p_game_time_ms int,
  p_flags jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.game_attempts;
  v_level public.game_attempt_levels;
  v_cfg jsonb;
  v_outcome public.level_outcome;
  v_elapsed_ms int;
  v_limit_ms int;
  v_flags jsonb := coalesce(p_flags, '{}'::jsonb);
  v_rewards jsonb;
  v_coupon public.coupons;
  v_reward_status text := 'none';
  v_max_total int;
  v_expires timestamptz;
  v_tries int := 0;
  v_last_level int;
begin
  if p_outcome not in ('passed', 'failed_time', 'failed_lives') then
    raise exception 'bad_outcome' using errcode = '22023';
  end if;

  select * into v_attempt from public.game_attempts where id = p_attempt for update;
  if not found or v_attempt.user_id <> p_user then
    return jsonb_build_object('error', 'attempt_not_found');
  end if;
  if v_attempt.status <> 'in_progress' then
    return jsonb_build_object('error', 'attempt_finished');
  end if;
  if p_level <> v_attempt.current_level then
    return jsonb_build_object('error', 'wrong_level', 'currentLevel', v_attempt.current_level);
  end if;

  select * into v_level from public.game_attempt_levels
  where attempt_id = p_attempt and level = p_level
  for update;
  if not found then
    return jsonb_build_object('error', 'level_not_started');
  end if;
  if v_level.submitted_at is not null then
    return jsonb_build_object('error', 'level_already_submitted');
  end if;

  v_cfg := v_attempt.settings_snapshot -> 'levels' -> (p_level - 1);
  -- The final level is whatever the attempt's own settings say (3 by default).
  v_last_level := greatest(1, jsonb_array_length(v_attempt.settings_snapshot -> 'levels'));
  v_outcome := p_outcome::public.level_outcome;
  v_elapsed_ms := floor(extract(epoch from (now() - v_level.started_at)) * 1000)::int;
  v_limit_ms := coalesce((v_attempt.settings_snapshot ->> 'countdownMs')::int, 3000)
    + coalesce((v_cfg ->> 'durationMs')::int, 30000)
    + 120000;

  -- A pass must take at least as long on the server's clock as it took in the game.
  if v_outcome = 'passed' and v_elapsed_ms + 1500 < coalesce(p_game_time_ms, 0) then
    v_outcome := 'invalid';
    v_flags := v_flags || jsonb_build_object('clock', 'faster_than_real_time');
  end if;
  -- A pass must reach the level's target.
  if v_outcome = 'passed' and coalesce(p_catches, 0) < coalesce((v_cfg ->> 'targetCatches')::int, 1) then
    v_outcome := 'invalid';
    v_flags := v_flags || jsonb_build_object('catches', 'below_target');
  end if;
  -- Tap times that go backwards mean the level clock was restarted mid-level (the server checks
  -- the order in which the taps were recorded and sets this flag).
  if v_outcome = 'passed' and coalesce((v_flags ->> 'rewound')::boolean, false) then
    v_outcome := 'invalid';
    v_flags := v_flags || jsonb_build_object('clock', 'rewound');
  end if;
  -- A pass must also arrive soon after the game says it ended: countdown + game time + 25 s for
  -- the network and one retry. A slowed-down game clock shows up here.
  if v_outcome = 'passed'
    and v_elapsed_ms > coalesce((v_attempt.settings_snapshot ->> 'countdownMs')::int, 3000) + coalesce(p_game_time_ms, 0) + 25000 then
    v_outcome := 'invalid';
    v_flags := v_flags || jsonb_build_object('clock', 'slower_than_real_time');
  end if;
  -- Results that arrive long after the level could have ended are not accepted.
  if v_elapsed_ms > v_limit_ms then
    v_outcome := 'abandoned';
    v_flags := v_flags || jsonb_build_object('clock', 'submitted_too_late');
  end if;

  update public.game_attempt_levels set
    submitted_at = now(),
    outcome = v_outcome,
    catches = greatest(0, least(coalesce(p_catches, 0), 32767)),
    decoy_hits = greatest(0, least(coalesce(p_decoy_hits, 0), 32767)),
    taps = greatest(0, least(coalesce(p_taps, 0), 32767)),
    game_time_ms = greatest(0, coalesce(p_game_time_ms, 0)),
    server_elapsed_ms = v_elapsed_ms,
    flags = v_flags
  where attempt_id = p_attempt and level = p_level;

  if v_outcome <> 'passed' then
    update public.game_attempts set status = 'lost', finished_at = now() where id = p_attempt;
    return jsonb_build_object('outcome', v_outcome, 'attemptStatus', 'lost', 'level', p_level);
  end if;

  if p_level < v_last_level then
    update public.game_attempts set current_level = p_level + 1 where id = p_attempt;
    return jsonb_build_object('outcome', v_outcome, 'attemptStatus', 'in_progress', 'level', p_level, 'nextLevel', p_level + 1);
  end if;

  -- Final level passed: the attempt is won.
  update public.game_attempts set status = 'won', finished_at = now() where id = p_attempt;
  perform public.write_audit(p_user, 'game.won', 'game_attempt', p_attempt::text, jsonb_build_object('attempt', v_attempt.attempt_number));

  -- Lock the reward policy row so stock limits hold under concurrent wins.
  select value into v_rewards from public.site_settings where key = 'rewards' for update;

  if v_rewards is null or coalesce((v_rewards ->> 'rewardsEnabled')::boolean, false) = false then
    v_reward_status := 'rewards_disabled';
  else
    v_max_total := nullif(v_rewards ->> 'maxCouponsTotal', '')::int;
    if v_max_total is not null and (select count(*) from public.coupons where status <> 'void') >= v_max_total then
      v_reward_status := 'stock_exhausted';
    else
      -- Admin saves expiresAt as ISO with +05:30; an unreadable value must never stop a winner's
      -- coupon from being issued, so it falls back to "no fixed expiry".
      begin
        v_expires := nullif(v_rewards ->> 'expiresAt', '')::timestamptz;
      exception when others then
        v_expires := null;
      end;
      if v_expires is null and nullif(v_rewards ->> 'expiresAfterHours', '') is not null then
        v_expires := now() + make_interval(hours => (v_rewards ->> 'expiresAfterHours')::int);
      end if;
      loop
        begin
          insert into public.coupons (code, user_id, attempt_id, label, value_text, max_redemptions, expires_at)
          values (
            public.generate_coupon_code(),
            p_user,
            p_attempt,
            coalesce(nullif(v_rewards ->> 'couponLabel', ''), 'TERRA UTSAV winner''s coupon'),
            nullif(v_rewards ->> 'couponValueText', ''),
            greatest(1, least(10, coalesce(nullif(v_rewards ->> 'maxRedemptions', '')::int, 1))),
            v_expires
          )
          returning * into v_coupon;
          exit;
        exception when unique_violation then
          -- Either this attempt already has its coupon (never issue a second) or the random code
          -- collided with an existing one (try a new code).
          select * into v_coupon from public.coupons where attempt_id = p_attempt;
          if found then
            exit;
          end if;
          v_tries := v_tries + 1;
          if v_tries > 5 then
            raise;
          end if;
        end;
      end loop;
      v_reward_status := 'issued';
      perform public.write_audit(p_user, 'coupon.issued', 'coupon', v_coupon.id::text, jsonb_build_object('code', v_coupon.code, 'attempt', p_attempt));
    end if;
  end if;

  return jsonb_build_object(
    'outcome', v_outcome,
    'attemptStatus', 'won',
    'level', p_level,
    'reward', v_reward_status,
    'coupon', case when v_coupon.id is null then null else jsonb_build_object(
      'code', v_coupon.code,
      'label', v_coupon.label,
      'valueText', v_coupon.value_text,
      'expiresAt', v_coupon.expires_at,
      'issuedAt', v_coupon.issued_at
    ) end
  );
end;
$$;

-- ------------------------------------------------------------------ coupons: staff
create or replace function public.coupon_status_of(c public.coupons)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when c.status = 'void' then 'void'
    when c.redemption_count >= c.max_redemptions or c.status = 'redeemed' then 'redeemed'
    when c.expires_at is not null and c.expires_at <= now() then 'expired'
    else 'valid'
  end;
$$;

create or replace function public.coupon_lookup(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := public.normalize_coupon_code(p_code);
  v_coupon public.coupons;
  v_email text;
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.rate_limit_hit('lookup:' || auth.uid()::text, 120, 60) then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  if v_code is null then
    return jsonb_build_object('status', 'invalid');
  end if;

  select * into v_coupon from public.coupons where code = v_code;
  if not found then
    return jsonb_build_object('status', 'invalid', 'code', v_code);
  end if;
  select email into v_email from public.profiles where id = v_coupon.user_id;

  return jsonb_build_object(
    'status', public.coupon_status_of(v_coupon),
    'code', v_coupon.code,
    'label', v_coupon.label,
    'valueText', v_coupon.value_text,
    'issuedAt', v_coupon.issued_at,
    'expiresAt', v_coupon.expires_at,
    'lastRedeemedAt', v_coupon.last_redeemed_at,
    'redemptionsLeft', greatest(0, v_coupon.max_redemptions - v_coupon.redemption_count),
    'holder', public.mask_email(v_email)
  );
end;
$$;

-- Atomic: a single conditional UPDATE. A second simultaneous request re-checks the row after
-- the first commits and finds nothing to update.
create or replace function public.coupon_redeem(p_code text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := public.normalize_coupon_code(p_code);
  v_coupon public.coupons;
  v_staff uuid := auth.uid();
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.rate_limit_hit('redeem:' || v_staff::text, 60, 60) then
    return jsonb_build_object('redeemed', false, 'status', 'rate_limited');
  end if;
  if v_code is null then
    return jsonb_build_object('redeemed', false, 'status', 'invalid');
  end if;

  update public.coupons c set
    redemption_count = c.redemption_count + 1,
    status = case when c.redemption_count + 1 >= c.max_redemptions then 'redeemed'::public.coupon_status else c.status end,
    last_redeemed_at = now()
  where c.code = v_code
    and c.status = 'issued'
    and c.redemption_count < c.max_redemptions
    and (c.expires_at is null or c.expires_at > now())
  returning * into v_coupon;

  if not found then
    select * into v_coupon from public.coupons where code = v_code;
    if not found then
      return jsonb_build_object('redeemed', false, 'status', 'invalid', 'code', v_code);
    end if;
    return jsonb_build_object(
      'redeemed', false,
      'status', public.coupon_status_of(v_coupon),
      'code', v_coupon.code,
      'lastRedeemedAt', v_coupon.last_redeemed_at,
      'expiresAt', v_coupon.expires_at
    );
  end if;

  insert into public.coupon_redemptions (coupon_id, redeemed_by, note)
  values (v_coupon.id, v_staff, nullif(left(coalesce(p_note, ''), 200), ''));
  perform public.write_audit(v_staff, 'coupon.redeemed', 'coupon', v_coupon.id::text, jsonb_build_object('code', v_coupon.code));

  return jsonb_build_object(
    'redeemed', true,
    'status', public.coupon_status_of(v_coupon),
    'code', v_coupon.code,
    'label', v_coupon.label,
    'valueText', v_coupon.value_text,
    'redemptionsLeft', greatest(0, v_coupon.max_redemptions - v_coupon.redemption_count),
    'redeemedAt', v_coupon.last_redeemed_at
  );
end;
$$;

create or replace function public.staff_recent_redemptions(p_limit int default 10)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('code', c.code, 'label', c.label, 'redeemedAt', r.redeemed_at) order by r.redeemed_at desc)
    from (
      select * from public.coupon_redemptions
      where redeemed_by = auth.uid()
      order by redeemed_at desc
      limit greatest(1, least(p_limit, 50))
    ) r
    join public.coupons c on c.id = r.coupon_id
  ), '[]'::jsonb);
end;
$$;

-- ------------------------------------------------------------------ admin
create or replace function public.admin_set_role(p_email text, p_role public.app_role, p_grant boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := auth.uid();
  v_target uuid;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select id into v_target from public.profiles where email = lower(trim(p_email));
  if v_target is null then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;
  if not p_grant and v_target = v_admin and p_role = 'admin' then
    return jsonb_build_object('ok', false, 'error', 'cannot_remove_own_admin');
  end if;

  if p_grant then
    insert into public.user_roles (user_id, role, granted_by) values (v_target, p_role, v_admin)
    on conflict (user_id, role) do nothing;
  else
    delete from public.user_roles where user_id = v_target and role = p_role;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_list_roles()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('email', p.email, 'role', r.role, 'grantedAt', r.granted_at) order by r.role, p.email)
    from public.user_roles r
    join public.profiles p on p.id = r.user_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_grant_bonus_attempts(p_email text, p_count int)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select id into v_target from public.profiles where email = lower(trim(p_email));
  if v_target is null then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;
  insert into public.player_state (user_id, bonus_attempts) values (v_target, greatest(0, least(10, p_count)))
  on conflict (user_id) do update set bonus_attempts = greatest(0, least(10, p_count)), updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_void_coupon(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coupon public.coupons;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.coupons set status = 'void'
  where code = public.normalize_coupon_code(p_code) and status = 'issued'
  returning * into v_coupon;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_voidable');
  end if;
  perform public.write_audit(auth.uid(), 'coupon.voided', 'coupon', v_coupon.id::text, jsonb_build_object('code', v_coupon.code));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'players', (select count(distinct user_id) from public.game_attempts),
    'attempts', (select count(*) from public.game_attempts where status <> 'void'),
    'attemptsInProgress', (select count(*) from public.game_attempts where status = 'in_progress'),
    'wins', (select count(*) from public.game_attempts where status = 'won'),
    'losses', (select count(*) from public.game_attempts where status = 'lost'),
    'couponsIssued', (select count(*) from public.coupons where status <> 'void'),
    'couponsRedeemed', (select count(*) from public.coupons where status = 'redeemed'),
    'couponsVoid', (select count(*) from public.coupons where status = 'void'),
    'redemptions', (select count(*) from public.coupon_redemptions),
    'invalidLevels', (select count(*) from public.game_attempt_levels where outcome = 'invalid'),
    'reachedLevel', (
      select coalesce(jsonb_object_agg(level, n), '{}'::jsonb)
      from (select level, count(*) as n from public.game_attempt_levels group by level) s
    ),
    'passedLevel', (
      select coalesce(jsonb_object_agg(level, n), '{}'::jsonb)
      from (select level, count(*) as n from public.game_attempt_levels where outcome = 'passed' group by level) s
    ),
    'challengeResults', (select count(*) from public.challenge_results),
    'challengeCompleted', (select count(*) from public.challenge_results where completed)
  ) into v;
  return v;
end;
$$;

-- ------------------------------------------------------------------ execution rights
-- Postgres lets everyone execute new functions by default. Lock them down explicitly.
revoke execute on function public.game_start_attempt(uuid) from public, anon, authenticated;
revoke execute on function public.game_start_level(uuid, uuid, int, bigint) from public, anon, authenticated;
revoke execute on function public.game_submit_level(uuid, uuid, int, text, int, int, int, int, jsonb) from public, anon, authenticated;
revoke execute on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
revoke execute on function public.write_audit(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.generate_coupon_code() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.audit_row_change() from public, anon, authenticated;

grant execute on function public.game_start_attempt(uuid) to service_role;
grant execute on function public.game_start_level(uuid, uuid, int, bigint) to service_role;
grant execute on function public.game_submit_level(uuid, uuid, int, text, int, int, int, int, jsonb) to service_role;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;

-- Staff and admin functions check the caller's role inside; anonymous callers have no use for them.
revoke execute on function public.coupon_lookup(text) from public, anon;
revoke execute on function public.coupon_redeem(text, text) from public, anon;
revoke execute on function public.staff_recent_redemptions(int) from public, anon;
revoke execute on function public.admin_set_role(text, public.app_role, boolean) from public, anon;
revoke execute on function public.admin_list_roles() from public, anon;
revoke execute on function public.admin_grant_bonus_attempts(text, int) from public, anon;
revoke execute on function public.admin_void_coupon(text) from public, anon;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.coupon_lookup(text) to authenticated;
grant execute on function public.coupon_redeem(text, text) to authenticated;
grant execute on function public.staff_recent_redemptions(int) to authenticated;
grant execute on function public.admin_set_role(text, public.app_role, boolean) to authenticated;
grant execute on function public.admin_list_roles() to authenticated;
grant execute on function public.admin_grant_bonus_attempts(text, int) to authenticated;
grant execute on function public.admin_void_coupon(text) to authenticated;
grant execute on function public.admin_stats() to authenticated;
