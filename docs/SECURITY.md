# Security and privacy

## What protects what

| Concern | Protection | Where |
|---|---|---|
| Who is playing | Players never sign up: the game gives each phone or browser a nameless guest account (Supabase anonymous sign-in) on its first "Play for a reward". Staff and admins sign in with email and password (Google optional). Server code calls `auth.getUser()`, which verifies the session with Supabase | `src/lib/auth.ts`, `src/lib/game/server.ts`, `GameExperience` |
| Staff and admin rights | `public.user_roles`, writable only through `admin_set_role()` by admins, or by the project owner in SQL. Never from profile fields or user metadata | migrations `0100`, `0200` |
| Private pages | Middleware redirects signed-out visitors; every private page and server action checks the role on the server; RLS and `SECURITY DEFINER` functions check again in the database | `src/middleware.ts`, `src/app/admin/*`, `src/app/staff/*` |
| Players reading other players' data | Row level security on every table: a guest sees only its own attempts, levels and coupons | migration `0300` |
| Writing game results | Only the service role can call `game_start_attempt`, `game_start_level`, `game_submit_level`. The secret key is server-only | migration `0200`, `src/lib/supabase/admin.ts` |
| Fake scores | The browser sends raw taps only. The server replays them against the seed it stored. Client-side outcome, score or "won" fields are ignored | `src/app/api/game/level/submit/route.ts` |
| Speed hacks | A pass must not end sooner on the server clock than in the game (1.5 s tolerance), nor take longer than the countdown + play time + 25 s (slowed clocks). Tap logs whose times run backwards are refused. Late submissions are refused | `game_submit_level`, `tapsRewound()` |
| Half-finished sign-ups | Reward play needs a guest account or a confirmed staff account; an email account that was never confirmed is refused | `gameContext()` in `src/lib/game/server.ts` |
| Reward play before it is ready | `game_start_attempt` refuses (`rewards_closed`) unless coupons are switched on and their terms confirmed in admin | `game_start_attempt` |
| More than one coupon each | `game_start_attempt` refuses (`already_won`) once the guest holds a coupon. A new browser is a new guest, so the rule "one coupon per person" is also applied by staff at the counter (the game, rules and staff console say so) | `game_start_attempt`, `RedeemConsole` |
| Reward play outside event day | New reward attempts start only between the event's start and end (admin > Event): `not_open_yet` before, `event_over` after. Staff and admins may start early to test (cancel their test coupons) | `game_start_attempt`, `src/lib/game/window.ts` |
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

## Players, guests and staff sign-in

- **Players have nothing to break into.** There are no player passwords or codes. A guest account lives only in the
  browser that made it (Supabase's session cookies), and it can only see its own attempts and coupon.
- **Another browser or another phone** is a new guest with its own two attempts, and it can win another coupon on
  screen. That is why "one coupon per person" is a counter rule: staff redeem one coupon for each person, and the
  staff console reminds them on every valid coupon.
- **Staff passwords.** Staff and admin accounts are made by an admin in the Supabase dashboard, with a strong password
  each (12 characters or more, never shared). Supabase limits sign-in tries per IP address, and every staff page and
  action checks the role on the server and again in the database.
- **No emails.** The site sends no sign-in emails, so Supabase's built-in email sender (team members only, 2 an hour)
  never matters.
- **CAPTCHA.** Supabase can require one (Authentication > Attack Protection), but the site would then have to send a
  CAPTCHA token for guests and staff. It does not, so **do not switch CAPTCHA on in Supabase**, or nobody will be able to
  play for a reward or sign in.

## Privacy

- Players: a random guest ID for their browser, their attempts, results and coupons. No name, email address or phone
  number.
- Staff and admins: their email address (to sign in) and the redemptions recorded under their name.
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
  stats, and each guest has two attempts. Staff can cancel a coupon that looks wrong. There is no perfect anti-cheat
  for a browser game, and this site does not claim one.
- **Playing again in another browser.** Without sign-up, a new browser or a cleared one is a new guest, and it can
  win another coupon on screen. What limits it: reward play runs on event day only, each win has to be a real one
  (the server replays every tap), staff redeem one coupon per person in person, the total number of coupons can be
  capped (admin > Rewards), and a coupon is worth half a Chocolate Bomb. Guest accounts are limited per IP address by
  Supabase (Rate Limits).
- **CSP allows inline scripts**, which Next.js needs for hydration without a nonce setup.
- **Rate limits** fail open if the limiter itself errors, so a database hiccup does not block play. Attempt limits and
  coupon rules do not depend on the limiter.
- **The view `team_members_public`** runs with its owner's rights (it is how photos without consent are hidden from the
  public). Supabase's linter will flag it as a security-definer view; that is intentional.
- **Dev-only dependencies** (lint and test tooling) have open advisories that do not ship to the site. Production
  dependencies audit clean (`npm audit --omit=dev`), with PostCSS pinned to a patched release via `overrides`.
