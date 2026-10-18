# TERRA UTSAV

Website for **TERRA UTSAV**, our stall at the **Eco-friendly Diwali Mandi 2026** (Tuesday 27 October 2026, 9 am to 3 pm,
S. B. Patil Institute of Management, Pradhikaran Road). Koochu Puchu is our original mascot.

Chocolate Bomb, Chat Papdi, homemade Diwali diyas, the 60-second wet-brick challenge, and **Catch the Koochu Puchu**, a
three-level game where winners get a coupon.

| Route | What it is |
|---|---|
| `/` | Homepage (approved design with a Diwali twist): hero with 3D akash kandils, five attractions, festive ribbon, "What's happening", Find us, food, 3D diyas, 3D brick challenge, game, close |
| `/menu` | Food and homemade diyas, editable from admin, with a 3D chocolate bomb to crack open |
| `/challenge` | Hold the Wet Brick: 3D brick, steps, draft safety rules, spectator timer (records nothing) |
| `/game` | Catch the Koochu Puchu: free practice and server-checked reward attempts. No sign-up: a win shows the coupon on screen |
| `/team` | The 17 students in their 7 teams, each card switching between a real photo and that person's Koochu Puchu, and a row for our 3 mentors (Ankush, Jidnyesh, Sairaj). Kept out of search engines (`noindex`, and team photos send `X-Robots-Tag`), with a line on how to get a photo taken down |
| `/rules` | Event, game, coupon and challenge rules, and how data is used |
| `/login`, `/auth/callback`, `/auth/signout` | Staff and admin sign-in with email and password (Google optional). Players never sign in |
| `/rewards` | The coupons won on this phone, with QR codes (no sign-in) |
| `/staff/redeem` | Staff console: scan or type a code, verify, redeem once, record brick results |
| `/admin` | Admin dashboard: stats, event, menu, team, game tuning, rewards, roles, coupons, audit log |

**Koochu Puchu, the chat helper**: the kitten button at the bottom right of the site's pages (not the game or sign-in) answers questions about the
stall (date and place, menu, the game and its coupon, the brick challenge, the team and mentors) from the site's own
content. See section 4.

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

### 3D, motion and the mystery eggs

- **3D scenes** (three.js, `src/components/three/`): akash kandils in the homepage hero, three clay diyas on a rangoli
  (tap to light or blow out), the wet brick on the homepage and `/challenge` (drag to turn it), and the chocolate bomb
  on `/menu` (tap, or press "Crack it open"). Each scene sits on top of a drawn version of the same picture. three.js is
  only downloaded when a scene comes near the screen, and it renders only while visible. Reduced motion, data saver,
  low-memory or low-core phones and browsers without WebGL 2 keep the drawings. The kandils run on screens 1024px and
  wider.
- **Smooth scrolling** (Lenis) on public pages with a mouse or trackpad. Touch, the game, staff, admin and sign-in keep
  native scrolling; so does reduced motion.
- **Mystery eggs**: four hidden surprises (hints in the footer). They are for fun only and never touch the game,
  coupons or the database; progress is kept in the visitor's browser.

## 2. Connect Supabase

1. **Create a project** at supabase.com (region: Mumbai `ap-south-1` is closest).
2. **Apply the migrations** in `supabase/migrations/`, in filename order. Either:
   - Supabase CLI: `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`, or
   - Dashboard > SQL Editor: paste and run each file in order (`...0100` to `...0600`). `...0500` sets the default
     settings (coupon value "50% off a Chocolate Bomb"; reward play stays closed until you tick "terms confirmed").
     `...0600` seeds the 17 students, their 7 groups and the 3 mentors.
3. **Auth settings** (Dashboard > Authentication). Players never sign up and the site sends no emails, so no email
   service is needed.
   - **Turn on anonymous sign-ins** (Sign In / Providers > Allow anonymous sign-ins). The first time a phone plays for a
     reward, the game gives it a nameless guest account; its attempts and coupon belong to that guest.
   - **Raise the anonymous sign-in limit** (Rate Limits). Supabase allows 30 new guests an hour from one IP address by
     default, and many phones on the campus Wi-Fi share one. A few hundred an hour is a safe event-day setting.
   - **Staff and admin accounts**: Users > Add user > Create new user, with an email, a strong password and
     **Auto Confirm User** ticked. They sign in at `/login`. Give them their role in step 5.
   - **The free plan pauses an idle project** after about a week of low activity. Supabase emails a warning first, and
     **Resume project** in the dashboard brings it back with all its data in a few minutes. Open the dashboard the day
     before the event and do the staff dry run then.
   - Optional, Google for staff: enable the Google provider, set `NEXT_PUBLIC_AUTH_GOOGLE=true`, and under URL
     configuration set the Site URL and the redirect URLs (`https://<your-domain>/auth/callback`,
     `http://localhost:3000/auth/callback`).
4. **Environment variables**: copy `.env.example` to `.env.local` and fill in the URL, publishable (or anon) key and
   secret (service role) key from Project Settings > API.
5. **Make yourself admin**: create your account as in step 3, then run in the SQL Editor:

   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'you@example.com';
   ```

   Every other role change happens in `/admin` > People & coupons (create the person's account first). Roles are never
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

- Dates and times in admin are entered in India time (IST) with date pickers.
- Photos chosen in admin are shrunk in the browser (longest side 1600 px, WebP) before they upload, so phone photos fit.
- **No sign-up, and coupons are for event day.** Reward play opens at the event's start time and closes at its end
  (`/admin/event`), and only once coupons are switched on and "terms confirmed" is ticked in `/admin/rewards`. Before
  the event the game page says "No sign-up needed. Coupons can be won on event day only"; practice is always open.
- The "Image is illustrative" tick in `/admin/menu` no longer puts a tag on the picture. While any item is ticked, the
  footer says so once, and the admin checklist keeps "Real photos of the food and diyas" open.
- The chat helper reads the same content as the pages. It picks up admin edits within about a minute (saving in
  admin refreshes it straight away). It uses no AI service: answers are matched from the site's facts in
  `src/lib/koochu/answer.ts`, and a question the site doesn't answer gets an honest "can't find that on this website"
  with the Instagram link, never a guess. It stays off the game, sign-in, staff and admin pages.

Two things live in code: the brick challenge rules (`src/content/challenge.ts`, set `rulesApproved: true` after the
organisers approve them) and the default content used when the database is unreachable (`src/content/`, `src/lib/settings.ts`).

## 5. How the game stays fair

- The browser sends only raw taps (time, x, y). The server regenerates the level from a seed it chose and stored,
  replays the taps with the same engine (`src/lib/game/engine.ts`) and decides the outcome. Client scores are ignored.
- The database checks that levels are played in order, once each, by the attempt's owner, and that a pass did not
  finish faster than the server clock allows. Taps faster than 140 ms after a kitten appears, rapid-fire spam and
  oversized logs do not count.
- **No sign-up.** Each phone or browser plays as its own guest player (a Supabase anonymous account the game makes
  on the first "Play for a reward"). Staff and admins play with their own accounts.
- Two reward attempts per player (configurable), enforced in Postgres with a row lock and a unique index. Starting a
  level and leaving counts as a loss. Admins can grant extra attempts to staff accounts.
- **Coupons can be won on event day only**: a reward attempt starts only between the event's start and end (admin >
  Event), and only while coupons are switched on and confirmed (admin > Rewards). Staff and admins can start early to
  test; cancel the coupons they win.
- **One coupon per person.** A guest that has already won cannot start another reward attempt. A new browser is a new
  guest, so someone can win again elsewhere; the rule is that staff redeem only one coupon per person at the stall,
  and the game, rules and staff console all say so.
- Clearing the last level (Level 3 by default) issues at most one coupon (unique per attempt), with an unpredictable
  code from the database's cryptographic random generator. Redemption is a single atomic update; a second phone cannot
  redeem the same coupon.
- Tap logs whose times run backwards, and passes that took far longer on the server clock than the level allows
  (countdown + play time + 25 s, a slow-motion trick), do not count.
- Limitations (honest): it is a client-side game. Someone who reverse-engineers the engine could script plausible taps.
  The checks above make that slow and visible in the admin stats ("Rejected results"). Staff can cancel suspicious
  coupons. See `docs/SECURITY.md`.

Difficulty targets roughly 20 to 30% of players winning across two attempts. The default settings model at about 25%
(`npm run game:simulate`); `/admin/game` shows the model for any edited settings. Confirm with real playtests.

## 6. Tests

`npm test` runs every test:

- **Game engine and tuning**: determinism, hit testing, bot-speed and spam rejection, level progression, modelled win rate.
- **Database** (real migrations in PGlite with a Supabase auth/storage shim): attempt limits, resume, abandoned levels, clock
  checks (too fast, too slow, rewound), event-day window and staff early access, coupon issuance (one per win, one per
  player, stock, expiry, rewards closed or unconfirmed), atomic redemption, row level security for players, staff,
  admins and the public, audit logging, seed data matching the code defaults.
- **Security**: API routes ignore client scores, refuse cross-site and malformed requests, half-finished email
  sign-ups and other players' attempts, and let guest players in;
  admin and staff actions refuse the wrong roles; middleware protects private pages; robots and structured data rules.
- **Components and pages**: team card switching (timing, pausing, off-screen, reduced motion, image fallbacks),
  navigation and mobile menu, menu cards and prices, 3D scene fallbacks, the mystery eggs, the chat widget (opens,
  answers, copes with being offline, stays off private pages), reward play states (no sign-up, guest player made on
  the first play, event day only, paused, over, resume), and every public route rendering without a database.
- **Chat answers**: date, place, menu (never an invented price), dishes by name with typos and Hindi or Marathi words,
  game and coupon numbers from the live settings, team, roles, people and mentors, and honest "the site doesn't say"
  replies.

PGlite has one connection, so true parallel transactions are not reproduced; concurrency safety comes from row locks
and unique constraints, which the tests exercise by replaying the same request.

## 7. Troubleshooting

- **"Couldn't start reward play just now"**: anonymous sign-ins are off, or the anonymous sign-in rate limit was hit
  (step 2.3).
- **Nothing that needs the database works (sign-in, coupons, admin)**: the free Supabase project may be paused. Open
  the dashboard and press Resume project.
- **Game says "Reward play opens on event day"**: it is before the event's start time in `/admin/event`. During the
  event, "Coupons are paused right now" means coupons are not switched on and confirmed in `/admin/rewards`.
- **"Reward play isn't switched on yet" or "Staff sign-in isn't switched on yet"**: `NEXT_PUBLIC_SUPABASE_URL` / key
  are missing in this environment, or `SUPABASE_SECRET_KEY` is missing on the server. Redeploy after adding them.
- **Staff page sends me to sign in**: your account needs the staff role (admin > People & coupons).
- **A staff member forgot their password**: in Supabase, Authentication > Users, open their account and set a new one.
- **Team photo not showing**: tick "agreed to their photo being published" for that person.
- **Chat gives an old answer**: it caches site content for up to a minute; saving anything in admin refreshes it.
- **Images from Supabase Storage do not load**: `NEXT_PUBLIC_SUPABASE_URL` must be set at build time (it allows the image host).
- **Port 3000 busy on Windows**: another `next` process is still running; stop it before `npm run build`.

More: `DESIGN.md` (design system), `docs/ASSET_MANIFEST.md` (every image and what still needs replacing),
`docs/SECURITY.md`, `docs/LAUNCH_CHECKLIST.md`.
