# TERRA UTSAV

Website for **TERRA UTSAV**, our stall at the **Eco-friendly Diwali Mandi 2026** (Tuesday 27 October 2026, 9 am to 3 pm,
S. B. Patil Institute of Management, Pradhikaran Road). Koochu Puchu is our original mascot.

Chocolate Bomb, Chat Papdi, homemade Diwali diyas, the 60-second wet-brick challenge, and **Catch the Koochu Puchu**, a
five-level game where winners get a coupon.

| Route | What it is |
|---|---|
| `/` | Homepage (approved design with a Diwali twist): hero, five attractions, "What's happening", Find us, food, diyas, challenge, game, close |
| `/menu` | Food and homemade diyas, editable from admin |
| `/challenge` | Hold the Wet Brick: steps, draft safety rules, spectator timer (records nothing) |
| `/game` | Catch the Koochu Puchu: free practice and server-checked reward attempts |
| `/team` | Mentors and team, each card switching between a real photo and that person's Koochu Puchu |
| `/rules` | Event, game, coupon and challenge rules, and how data is used |
| `/login`, `/auth/callback`, `/auth/signout` | Passwordless sign-in (email link or 6-digit code; Google optional) |
| `/rewards` | A student's coupon wallet with QR codes |
| `/staff/redeem` | Staff console: scan or type a code, verify, redeem once, record brick results |
| `/admin` | Admin dashboard: stats, event, menu, team, game tuning, rewards, roles, coupons, audit log |

Stack: Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS 4 · Framer Motion · Supabase (Auth, Postgres, RLS,
Storage) · Vitest + PGlite · Vercel.

---

## 1. Run it locally

Requires Node 20.11+ (tested on Node 24).

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without Supabase the whole public site works from built-in defaults (menu, event details,
game practice, team preview). Sign-in, reward play, the wallet, staff and admin pages explain that Supabase is not
connected yet.

Useful scripts:

| Command | Does |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, strict |
| `npm test` | All tests (game engine, database, security, components, pages) |
| `npm run test:db` | Database tests only (runs the real migrations in an in-memory Postgres) |
| `npm run game:simulate` | Prints the modelled win rate for the default difficulty |
| `npm run build` | Production build |
| `npm run check` | lint + typecheck + tests + build |
| `npm run assets:build` | Rebuilds web images from `design/` (needs Python with Pillow and numpy) |

## 2. Connect Supabase

1. **Create a project** at supabase.com (region: Mumbai `ap-south-1` is closest).
2. **Apply the migrations** in `supabase/migrations/`, in filename order. Either:
   - Supabase CLI: `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`, or
   - Dashboard > SQL Editor: paste and run each file in order (`...0100` to `...0500`).
3. **Auth settings** (Dashboard > Authentication):
   - URL configuration: Site URL = your production URL. Redirect URLs: `https://<your-domain>/auth/callback`,
     `http://localhost:3000/auth/callback`, and your Vercel preview pattern, e.g. `https://*-<team>.vercel.app/auth/callback`.
   - Email templates > Magic Link: add the code so students can type it on another device, e.g.
     `<p>Your TERRA UTSAV sign-in code: <strong>{{ .Token }}</strong></p>` next to the existing link.
   - For an event day, set up custom SMTP (Auth > SMTP) so sign-in emails are not limited by the built-in sender.
   - Optional: enable the Google provider and set `NEXT_PUBLIC_AUTH_GOOGLE=true`.
4. **Environment variables**: copy `.env.example` to `.env.local` and fill in the URL, publishable (or anon) key and
   secret (service role) key from Project Settings > API.
5. **Make yourself admin**: sign in once on the site, then run in the SQL Editor:

   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'you@example.com';
   ```

   Every other role change happens in `/admin` > People & coupons (people must sign in once first). Roles are never
   taken from anything a user can edit.
6. Visit `/admin`: work through the "Before the event" checklist.

## 3. Put it on GitHub (your intended account) and deploy on Vercel

Do this with the GitHub account you actually want to own the project, which may not be the one currently signed in on
this computer. Check with `gh auth status`; sign in or switch with `gh auth login` / `gh auth switch`.

```bash
git init
git add .
git commit -m "TERRA UTSAV website"
git branch -M main
git remote add origin https://github.com/<your-account>/terra-utsav.git
git push -u origin main
```

`.env*` files are ignored, so no secrets are pushed (only `.env.example` with placeholders).

Then on vercel.com, signed in with the intended account:

1. Add New > Project > import the repository. Framework: Next.js (detected). No build settings to change.
2. Environment Variables (Production and Preview): `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (and `NEXT_PUBLIC_AUTH_GOOGLE` if used).
3. Deploy. Add your domain under Settings > Domains and set `NEXT_PUBLIC_SITE_URL` to it, then redeploy.
4. In Supabase, add the production domain to the Auth redirect URLs (step 2.3).

Search engines: only the production deployment is indexable. Preview deployments send `noindex` and a blocking
`robots.txt` automatically (`VERCEL_ENV`).

## 4. Updating content

Everything that changes before the event is in `/admin`, not in code: event details, timings and stall spot, menu
items, prices, photos and availability, team groups, people, photos (published only with consent) and mascot outfits,
game difficulty, reward value, expiry, stock and terms, staff roles, extra attempts, cancelling coupons.

Two things live in code: the brick challenge rules (`src/content/challenge.ts`, set `rulesApproved: true` after the
organisers approve them) and the default content used when the database is unreachable (`src/content/`, `src/lib/settings.ts`).

## 5. How the game stays fair

- The browser sends only raw taps (time, x, y). The server regenerates the level from a seed it chose and stored,
  replays the taps with the same engine (`src/lib/game/engine.ts`) and decides the outcome. Client scores are ignored.
- The database checks that levels are played in order, once each, by the attempt's owner, and that a pass did not
  finish faster than the server clock allows. Taps faster than 140 ms after a kitten appears, rapid-fire spam and
  oversized logs do not count.
- Two reward attempts per student (configurable), enforced in Postgres with a row lock and a unique index. Starting a
  level and leaving counts as a loss. Admins can grant extra attempts.
- A Level 5 win issues at most one coupon (unique per attempt), with an unpredictable code from the database's
  cryptographic random generator. Redemption is a single atomic update; a second phone cannot redeem the same coupon.
- Limitations (honest): it is a client-side game. Someone who reverse-engineers the engine could script plausible taps.
  The checks above make that slow, visible in the admin stats ("Rejected results") and limited to two attempts per
  account. Staff can cancel suspicious coupons. See `docs/SECURITY.md`.

Difficulty targets roughly 20 to 30% of players winning across two attempts. The default settings model at about 25%
(`npm run game:simulate`); `/admin/game` shows the model for any edited settings. Confirm with real playtests.

## 6. Tests

`npm test` runs 105 tests:

- **Game engine and tuning**: determinism, hit testing, bot-speed and spam rejection, level progression, modelled win rate.
- **Database** (real migrations in PGlite with a Supabase auth/storage shim): attempt limits, resume, abandoned levels, clock
  checks, coupon issuance (one per win, stock, expiry, disabled rewards), atomic redemption, row level security for
  students, staff, admins and the public, audit logging, seed data matching the code defaults.
- **Security**: API routes ignore client scores, refuse cross-site and malformed requests and other players' attempts;
  admin and staff actions refuse the wrong roles; middleware protects private pages; robots and structured data rules.
- **Components and pages**: team card switching (timing, pausing, off-screen, reduced motion, image fallbacks),
  navigation and mobile menu, menu cards and prices, and every public route rendering without a database.

PGlite has one connection, so true parallel transactions are not reproduced; concurrency safety comes from row locks
and unique constraints, which the tests exercise by replaying the same request.

## 7. Troubleshooting

- **Sign-in email never arrives**: check Auth > Logs in Supabase; the built-in email sender has a low hourly limit. Use custom SMTP.
- **"Sign-in is not switched on yet"**: `NEXT_PUBLIC_SUPABASE_URL` / key missing in this environment. Redeploy after adding them.
- **Reward play says "not configured"**: `SUPABASE_SECRET_KEY` is missing on the server.
- **Staff page sends me to sign in**: your account needs the staff role (admin > People & coupons).
- **Team photo not showing**: tick "agreed to their photo being published" for that person.
- **Images from Supabase Storage do not load**: `NEXT_PUBLIC_SUPABASE_URL` must be set at build time (it allows the image host).
- **Port 3000 busy on Windows**: another `next` process is still running; stop it before `npm run build`.

More: `DESIGN.md` (design system), `docs/ASSET_MANIFEST.md` (every image and what still needs replacing),
`docs/SECURITY.md`, `docs/LAUNCH_CHECKLIST.md`.
