# Security and privacy

## What protects what

| Concern | Protection | Where |
|---|---|---|
| Who is signed in | Supabase Auth (passwordless email). Server code calls `auth.getUser()`, which verifies the session with Supabase | `src/lib/auth.ts`, `src/lib/game/server.ts` |
| Staff and admin rights | `public.user_roles`, writable only through `admin_set_role()` by admins, or by the project owner in SQL. Never from profile fields or user metadata | migrations `0100`, `0200` |
| Private pages | Middleware redirects signed-out visitors; every private page and server action checks the role on the server; RLS and `SECURITY DEFINER` functions check again in the database | `src/middleware.ts`, `src/app/admin/*`, `src/app/staff/*` |
| Students reading other students' data | Row level security on every table: students see only their own profile, attempts, levels and coupons | migration `0300` |
| Writing game results | Only the service role can call `game_start_attempt`, `game_start_level`, `game_submit_level`. The secret key is server-only | migration `0200`, `src/lib/supabase/admin.ts` |
| Fake scores | The browser sends raw taps only. The server replays them against the seed it stored. Client-side outcome, score or "won" fields are ignored | `src/app/api/game/level/submit/route.ts` |
| Speed hacks | A pass must not end sooner on the server clock than in the game (1.5 s tolerance). Late submissions are refused | `game_submit_level` |
| Bots and spam | Reactions under 140 ms ignored; taps closer than 90 ms ignored; at most 160 counted taps per level; at most 600 taps per request; per-user rate limits shared across servers | `src/lib/game/engine.ts`, `rate_limit_hit()` |
| Two attempts | Counted in Postgres under a row lock on the player; a partial unique index allows one unfinished attempt per player | `game_start_attempt` |
| Duplicate coupons | `coupons.attempt_id` is unique; issuance retries only on code collisions | `game_submit_level` |
| Guessable codes | 10 Crockford base32 characters (50 bits) from `gen_random_uuid()` (cryptographic RNG) | `generate_coupon_code()` |
| Double redemption | One conditional `UPDATE ... WHERE status = 'issued' AND count < max AND not expired`. Concurrent requests re-check after the first commits | `coupon_redeem()` |
| Accountability | Audit log for admin edits (menu, team, settings, roles, extra attempts), coupon issue, redeem and cancel; redemptions record the staff member | `audit_row_change()`, `write_audit()` |
| Cross-site requests | Game API needs same-origin JSON; sign-out is POST with an origin check; server actions use Next.js's built-in origin checks | `src/lib/api.ts` |
| Open redirects | `next` parameters must be same-site paths | `safeNextPath()` |
| Uploads | Admin-only storage policies; images only (WebP, JPEG, PNG, AVIF), 5 MB maximum, random file names | migration `0400`, `uploadImage()` |
| Headers | CSP (self + Supabase), frame-ancestors none, nosniff, referrer policy, permissions policy (camera for this site only, for QR scanning), HSTS | `next.config.ts` |
| Secrets | `.env*` ignored by Git; only `.env.example` with placeholders is committed | `.gitignore` |

## Privacy

- Students: we store email (sign-in), attempts, results and coupons. Nothing else is collected.
- Staff see a masked email (`ab***@college.edu`) when checking a coupon, never the full address.
- Team photos are published only when an admin ticks consent for that person; until then the public view hides the
  photo URL entirely (`team_members_public`).
- The brick challenge page records nothing. Staff may record a result with an optional nickname.

## Known limitations

- **It is a client-side game.** The rules engine ships to the browser, so a determined person could write a script
  that taps at human-like times. The server checks make this slow and imperfect, rejected results show in the admin
  stats, and each account has two attempts. Staff can cancel a coupon that looks wrong. There is no perfect anti-cheat
  for a browser game, and this site does not claim one.
- **Multiple accounts.** Anyone with several email addresses can sign in several times. Coupons are tied to the
  account that won them; organisers can decide at the stall.
- **CSP allows inline scripts**, which Next.js needs for hydration without a nonce setup.
- **Rate limits** fail open if the limiter itself errors, so a database hiccup does not block play. Attempt limits and
  coupon rules do not depend on the limiter.
- **The view `team_members_public`** runs with its owner's rights (it is how photos without consent are hidden from the
  public). Supabase's linter will flag it as a security-definer view; that is intentional.
- **Dev-only dependencies** (lint and test tooling) have open advisories that do not ship to the site. Production
  dependencies audit clean (`npm audit --omit=dev`), with PostCSS pinned to a patched release via `overrides`.
