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
| Speed hacks | A pass must not end sooner on the server clock than in the game (1.5 s tolerance), nor take longer than the countdown + play time + 25 s (slowed clocks). Tap logs whose times run backwards are refused. Late submissions are refused | `game_submit_level`, `tapsRewound()` |
| Unconfirmed or anonymous accounts | Reward play needs a signed-in, non-anonymous user with a confirmed email | `gameContext()` in `src/lib/game/server.ts` |
| Reward play before it is ready | `game_start_attempt` refuses (`rewards_closed`) unless coupons are switched on and their terms confirmed in admin | `game_start_attempt` |
| More than one coupon each | `game_start_attempt` refuses (`already_won`) once the player holds a coupon | `game_start_attempt` |
| Bots and spam | Reactions under 140 ms ignored; taps closer than 90 ms ignored; at most 160 counted taps per level; at most 600 taps per request; per-user rate limits shared across servers | `src/lib/game/engine.ts`, `rate_limit_hit()` |
| Two attempts | Counted in Postgres under a row lock on the player; a partial unique index allows one unfinished attempt per player | `game_start_attempt` |
| Duplicate coupons | `coupons.attempt_id` is unique; issuance retries only on code collisions | `game_submit_level` |
| Guessable codes | 10 Crockford base32 characters (50 bits) from `gen_random_uuid()` (cryptographic RNG) | `generate_coupon_code()` |
| Double redemption | One conditional `UPDATE ... WHERE status = 'issued' AND count < max AND not expired`. Concurrent requests re-check after the first commits | `coupon_redeem()` |
| Accountability | Audit log for admin edits (menu, team, settings, roles, extra attempts), coupon issue, redeem and cancel; redemptions record the staff member | `audit_row_change()`, `write_audit()` |
| Chat helper | `/api/koochu` takes same-origin JSON only, at most 2,000 bytes, a question of 1 to 300 characters. Answers come from public site content; nothing is stored or sent to another service | `src/app/api/koochu/route.ts`, `src/lib/koochu/` |
| Cross-site requests | Game API needs same-origin JSON; sign-out is POST with an origin check; server actions use Next.js's built-in origin checks | `src/lib/api.ts` |
| Open redirects | `next` parameters must be same-site paths | `safeNextPath()` |
| Uploads | Admin-only storage policies; images only (WebP, JPEG, PNG, AVIF), 5 MB maximum, random file names. The admin form shrinks photos in the browser first (1600 px, WebP) | migration `0400`, `uploadImage()`, `ImageField` |
| Headers | CSP (self + Supabase), frame-ancestors none, nosniff, referrer policy, permissions policy (camera for this site only, for QR scanning), HSTS | `next.config.ts` |
| Secrets | `.env*` ignored by Git; only `.env.example` with placeholders is committed | `.gitignore` |

## Privacy

- Students: we store email (sign-in), attempts, results and coupons. Nothing else is collected.
- Staff see a masked email (`ab***@college.edu`) when checking a coupon, never the full address.
- Team photos are published only when an admin ticks consent for that person; until then the public view hides the
  photo URL entirely (`team_members_public`).
- The team page is kept out of search engines (`noindex, noimageindex`, left out of the sitemap, and `X-Robots-Tag` on
  `/images/team/*`), and it says how to get a photo changed or removed (the contact email from admin, or Instagram).
- The chat helper keeps no history: a question is answered and forgotten. The conversation lives only in the open
  browser tab.
- The brick challenge page records nothing. Staff may record a result with an optional nickname.

## Known limitations

- **It is a client-side game.** The rules engine ships to the browser, so a determined person could write a script
  that taps at human-like times. The server checks make this slow and imperfect, rejected results show in the admin
  stats, and each account has two attempts. Staff can cancel a coupon that looks wrong. There is no perfect anti-cheat
  for a browser game, and this site does not claim one.
- **Multiple accounts.** Anyone with several confirmed email addresses can sign in several times, and the one-coupon
  rule is per account. Coupons are tied to the account that won them; organisers can decide at the stall. Limiting
  sign-in to the college's email domain, or adding a CAPTCHA, would need a decision from the organisers.
- **CSP allows inline scripts**, which Next.js needs for hydration without a nonce setup.
- **Rate limits** fail open if the limiter itself errors, so a database hiccup does not block play. Attempt limits and
  coupon rules do not depend on the limiter.
- **The view `team_members_public`** runs with its owner's rights (it is how photos without consent are hidden from the
  public). Supabase's linter will flag it as a security-definer view; that is intentional.
- **Dev-only dependencies** (lint and test tooling) have open advisories that do not ship to the site. Production
  dependencies audit clean (`npm audit --omit=dev`), with PostCSS pinned to a patched release via `overrides`.
