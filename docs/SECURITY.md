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
| Reward play outside event day | New reward attempts start only between the event's start and end (admin > Event): `not_open_yet` before, `event_over` after. Sign-ups stay open at any time. Staff and admins may start early to test (cancel their test coupons) | `game_start_attempt`, `src/lib/game/window.ts` |
| One inbox, many addresses | `canonical_email()` folds case, `+tags` and Gmail dots, so `n.ame+1@gmail.com` and `name@gmail.com` are one player: only the first to play gets reward attempts (`alias_account`), under an advisory lock | `game_start_attempt`, `canonical_email()` |
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

## Sign-in: what stops a stranger getting in

- **Guessing the 6-digit code.** A code belongs to one email address, works once, expires, and Supabase limits how
  many codes can be tried from one place per hour. A random number has about a one-in-a-million chance per try.
  Set **Authentication > Providers > Email > Email OTP Expiration** to 600 seconds (10 minutes; the default is an
  hour) to shrink the window further.
- **No way around the code.** Every route into an account goes through Supabase: the 6-digit code
  (`verifyOtp`), the email link (`exchangeCodeForSession`, which only works in the browser that asked for it, or a
  `token_hash` that Supabase checks) and Google. The server re-checks the session with Supabase on every request
  (`auth.getUser()`), and reward play also needs a confirmed email.
- **Another browser or another phone.** Signing in with the same email anywhere is the same account: the same
  attempts and the same one coupon, counted in the database, not in the browser. The site never uses phone numbers
  or SIM cards.
- **Another email address.** A different inbox is a different account. Aliases of one inbox count as one player (see
  above). Genuinely separate inboxes (a second Gmail, a throwaway-mail site) are the remaining gap; see Known
  limitations.
- **CAPTCHA.** Supabase can require one (Authentication > Attack Protection), but the sign-in form must then send a
  CAPTCHA token. The site does not do that yet, so **do not switch CAPTCHA on in Supabase until it does**, or nobody
  will be able to sign in.

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
- **Multiple accounts.** Anyone with several real inboxes can sign up several times, and the one-coupon rule is per
  player. What limits the damage: aliases of one inbox count as one player, reward play runs on event day only, the
  total number of coupons can be capped (admin > Rewards), staff redeem every coupon in person, and a coupon is worth
  half a Chocolate Bomb. Stronger options need the organisers' decision: reward play for college email addresses
  only, a code shown at the stall that starts a reward attempt (so players must be there), or a CAPTCHA.
- **CSP allows inline scripts**, which Next.js needs for hydration without a nonce setup.
- **Rate limits** fail open if the limiter itself errors, so a database hiccup does not block play. Attempt limits and
  coupon rules do not depend on the limiter.
- **The view `team_members_public`** runs with its owner's rights (it is how photos without consent are hidden from the
  public). Supabase's linter will flag it as a security-definer view; that is intentional.
- **Dev-only dependencies** (lint and test tooling) have open advisories that do not ship to the site. Production
  dependencies audit clean (`npm audit --omit=dev`), with PostCSS pinned to a patched release via `overrides`.
