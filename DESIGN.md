# TERRA UTSAV — Design System

The single source of truth for the look of the site. Tokens below are implemented as CSS custom
properties in `src/app/globals.css` and exposed to Tailwind through `@theme`. Change a value there,
not in components.

## 1. Direction

**Idea:** a festival night at our stall. Koochu Puchu, a mischievous calico kitten, has already
got into the chocolate. Everything on the page feels like it belongs to that stall: wooden
signposts, torn paper notes, cream menu cards, chocolate drips and warm string lights.

**Approved reference:** the homepage screenshot approved by the team (supplied in chat on
2026-10-18; please save a copy as `design/reference/homepage-final.png`). Its composition, which
the homepage follows:

1. Plain top bar: `TERRA UTSAV` wordmark with a paw (left), five text links (centre), an outlined
   "Find Our Stall" pill with a map pin (right).
2. Hero on a deep burgundy festival backdrop. Koochu Puchu leaps in from the left with a
   chocolate-covered paw over a cracked chocolate bomb; a torn paper note says "CAN YOU CATCH
   ME?". Centre: "Came for the **Food.** Stayed for the **Chaos.**" stacked, the two nouns huge.
   One supporting sentence, then a maroon primary pill ("Catch Koochu Puchu", sub-line "5 levels ·
   2 attempts · win a coupon") and a cream secondary pill ("Explore Menu"). Right: a wooden
   signpost with planks linking to the attractions. "Scroll to explore" below.
3. A cream card strip overlapping the hero's bottom edge with four attractions (Chocolate Bomb,
   Chat Papdi, 60-Second Brick Challenge, Catch Koochu Puchu), each with an image, a title, a
   three-word tagline and a dark pill button.
4. A chocolate-drip divider into a dark band: Koochu Puchu peeking up beside a paper note "What's
   happening at our stall?", four round outlined icon badges (Delicious Food, Fun Challenges,
   Exciting Coupons, Good Vibes) and a "Find us at TERRA UTSAV" card with a map.

Other reference files in `design/reference/` (asset boards and two hero concepts) define the
mascot, palette and UI parts (buttons, coupon ticket, level-select screen).

### Diwali twist (requested 2026-10-18)

The stall is at the **Eco-friendly Diwali Mandi 2026**. The approved layout and headline stay; a Diwali layer sits on
top of it:

- **Marigold toran** (orange and yellow flowers with mango leaves) along the top of every dark hero, with
  **star-shaped akash kandils** swaying on strings and warm string lights.
- **Lit diyas** (code-drawn, flickering flames) in rows under the hero actions, in closings and loading states, and as
  the illustration for the homemade diyas until real photos arrive.
- **Rangoli** medallions behind the diyas and as dotted floors under the game's gift boxes.
- **No fireworks**: it is an eco-friendly Diwali, so the night sky has gently twinkling stars instead.
- Game: Koochu Puchu pops out of Diwali gift boxes; levels include "Diya Dash" and "Diwali Finale".
- A fifth attraction, **Homemade Diwali Diyas**, joins the card strip, the signpost, the menu and its own homepage section.

Diwali accent tokens (art only, never text): `--color-marigold-300 #FFC93C`, `--color-marigold-500 #F28C28`,
`--color-marigold-700 #C4561A`, `--color-flame #FFE08A`, `--color-rangoli-pink #E0457B`,
`--color-rangoli-teal #1FA5A0`, `--color-leaf #3F7D3A`.

## 2. Colour tokens

| Token | Value | Use |
|---|---|---|
| `--tu-night` | `#1E0709` | Deepest ground, footer |
| `--tu-burgundy-900` | `#3A0F17` | Main dark ground |
| `--tu-burgundy-800` | `#4F1420` | Raised dark surface |
| `--tu-maroon-700` | `#7A1A2A` | Pressed action, borders on dark |
| `--tu-maroon-600` | `#931F33` | Primary action fill |
| `--tu-maroon-500` | `#AE2A40` | Primary action hover |
| `--tu-choc-900` | `#24120C` | Chocolate ground, outlines of display type |
| `--tu-choc-800` | `#3A1F14` | Chocolate surface, dark buttons on cream |
| `--tu-choc-700` | `#5A321F` | Chocolate mid |
| `--tu-cream-50` | `#FFF8EC` | Card highlight |
| `--tu-cream-100` | `#FBEFDB` | Card surface, text on dark |
| `--tu-cream-200` | `#F4E2C4` | Cream ground |
| `--tu-cream-300` | `#E9CFA6` | Cream deep, dividers on cream |
| `--tu-gold-300` | `#F7D58C` | Display highlight |
| `--tu-gold-400` | `#EDB95C` | Accent (one per screen) |
| `--tu-gold-500` | `#D99A3C` | Accent pressed, icon strokes |
| `--tu-ink` | `#2B140D` | Text on cream |
| `--tu-ink-soft` | `#5B3A2B` | Secondary text on cream (16px+) |
| `--tu-paper` | `#EFDDBB` | Torn paper notes |
| `--tu-wood-700` | `#5A3119` | Signpost planks |
| `--tu-success` | `#7BD69C` | Valid state on dark |
| `--tu-danger` | `#FF8A80` | Error state on dark |

Proportions: dark grounds (burgundy/chocolate) carry most screens; cream is the card and
reading surface; gold appears on one thing per screen (an action highlight or the display
outline). Running text is full-strength cream on dark and full-strength ink on cream.

## 3. Type

| Role | Family | Size | Notes |
|---|---|---|---|
| Display XL | Lilita One | `clamp(3.5rem, 10vw, 8.75rem)` | Hero nouns ("Food.", "Chaos."), sticker style |
| Display L | Lilita One | `clamp(2.75rem, 6.5vw, 5.25rem)` | Page titles |
| Display M | Lilita One | `clamp(2rem, 4.2vw, 3.4rem)` | Section headings |
| Title | Lilita One | `clamp(1.35rem, 2.1vw, 1.75rem)` | Card titles, buttons |
| Hand | Kalam 700 | `clamp(1.1rem, 1.8vw, 1.6rem)` | Paper notes and signpost planks only |
| Body L | Nunito | `1.125rem / 1.6` | Intros |
| Body | Nunito | `1rem / 1.6` | Running text (never below 16px) |
| Small | Nunito 700 | `0.875rem / 1.45` | Meta lines, captions |

Display tracking `-0.01em`, leading `0.92`. Headlines are written to fit two lines at every width.
**Sticker style** (`.text-sticker`): cream fill, chocolate outline `0.055em`, a chocolate extrude
shadow below. Used only on display sizes.

## 4. Space, radius, depth

- Base unit 4px. Page gutter: 16px (phone), 24px (tablet), 32px (desktop). Content max 1240px.
- Section padding: `clamp(72px, 10vw, 160px)` top and bottom; gaps inside a section never exceed
  half of that.
- Radius: small 12px, card 24px, panel 32px, pill 999px. Buttons are always pills (reference).
- Depth: warm, low, heavy shadows only on cards that sit over the dark ground
  (`--shadow-card: 0 22px 44px -22px rgb(18 4 6 / 0.75)`). Buttons use a solid 3D edge
  (`0 5px 0 var(--tu-maroon-700)`) that collapses on press.

## 5. Components

- **Wordmark:** "TERRA UTSAV" in Lilita One, sticker style, paw mark after it. Set in HTML, never
  an image.
- **Buttons:** primary maroon pill with a cream inner ring; secondary cream pill with ink text;
  dark pill (chocolate) on cream cards. Label in Lilita One, optional sub-line in Nunito 700.
- **Signpost plank:** wood fill, hand-lettered label, outlined icon; each plank is a link.
- **Paper note:** torn edges via CSS `clip-path`, Kalam, slight rotation.
- **Card (cream):** cream-100 surface, 24px radius, image left or top, title, tagline, dark pill.
- **Chocolate drip divider:** inline SVG path between dark and cream sections.
- **Icon badge:** 64–88px circle, 2px gold-500 outline, cream line icon (lucide, 1.75 stroke).
- **Coupon ticket:** cream ticket with notched sides, code in Lilita One, QR on the right.

## 6. Motion

| Token | Value |
|---|---|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` |
| `--dur-fast` | 160ms (press, hover) |
| `--dur-base` | 280ms (menus, cards) |
| `--dur-slow` | 600ms (section entrances) |

- Signature move: the hero headline lands word by word (Food., then Chaos.) with a short
  squash-and-settle, while Koochu Puchu drifts in from the left.
- Section entrances: heading, text, picture, staggered 70ms, rise 24px with opacity, once.
- Team cards: photo ↔ mascot crossfade 700ms with 1.04 → 1 scale, every 4 s while visible.
- Buttons: press scale 0.97 and the 3D edge collapses; hover lifts 2px.
- `prefers-reduced-motion: reduce`: no travel, no loops; content appears in place; team cards
  switch only when the visitor presses the switch button.

## 7. House rules we keep (from the website skill) and where the brand overrides them

Kept: headlines in two lines or fewer; no eyebrows or pill badges above headlines; no monospace;
no glassmorphism; no emoji; no gradient blobs; running text at full strength and 16px or more;
real semantic HTML for everything (never a screenshot as a background).

Overridden by the approved brand reference (recorded on purpose): warm shadows on cards over the
dark ground, the sticker extrude on display type, round outlined icon badges in the "What's
happening" band, pill buttons, and soft radial light on the festival backdrop (it represents the
string lights in the reference).

## 8. Imagery

See `docs/ASSET_MANIFEST.md`. Order of preference: real photographs supplied by the team → the
approved reference art (cropped, never with its baked-in text) → generated renders of Koochu
Puchu made from the locked character reference → crisp drawings in code. Generated and cropped
food images are illustrative and labelled for replacement with real photographs.
