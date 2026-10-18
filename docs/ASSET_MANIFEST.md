# Asset manifest

Every image the site uses, where it came from, and whether it should be replaced before the event.

**Sources**
- **Reference art**: the team's approved concept images in `design/reference/` (homepage concept, hero concept, two
  asset boards). Crops never include their baked-in text.
- **Generated**: `design/generated/mascot-reference.png`, a 1264 px Koochu Puchu render made with Canva AI image
  generation from the approved art, used as the locked character reference.
- **Drawn in code**: SVG components in `src/components/art/` (crisp at any size, theme colours).
- Web images are rebuilt from the sources with `npm run assets:build` (`scripts/assets/build_assets.py`).

Image generation stopped early: the connected Canva account ran out of AI credits after the first render, and
background removal needs a paid Canva plan. Cut-outs were made locally instead. The prompts for the missing renders
are at the end of this file, ready for when credits are available.

## Raster images (`public/`)

| File | Size | Used for | Source | Status |
|---|---|---|---|---|
| `images/mascot/koochu-idle.webp` | 762×1000, transparent | Mascot in cards, game home, team hero, final call to action | Generated render, cut out locally | Good. Faint floor highlight left of the paws |
| `images/mascot/koochu-idle-cream.webp` | 900×900 | Base for every team mascot (outfits drawn over it) | Generated render | Good |
| `images/game/koochu-peek.webp` | 520×474, transparent | Game pop-up target, "What's happening" band | Generated render, head crop | Good |
| `images/scenes/koochu-chocolate-bomb.webp` | 1188×1422 | Homepage hero, share image | Reference art (hero concept), text-free crop, 1.8× upscale | Usable. Replace with a high-res render for crisp retina display |
| `images/scenes/koochu-paw.webp` | 696×1040 | Homepage game section | Reference art (approved homepage), kitten-only crop, 2× upscale | Usable. Same note |
| `images/hero/festival-bokeh.webp` | 1280×853 | Hero background | Reference art blurred far past legibility | Good |
| `images/food/chocolate-bomb.webp` | 800×1000 | Menu and homepage | Reference art crop, 2× upscale | **Replace** with a real photo of the dish. Labelled "Illustrative image" on the site |
| `images/food/chat-papdi.webp` | 740×880 | Menu and homepage | Reference art crop, 2× upscale | **Replace** with a real photo. Labelled "Illustrative image" |
| `images/game/run-1.webp`, `run-2.webp` | ~215×200, transparent | Dashing kitten in the game (2-frame run) | Asset board A, cut out, 2.4× upscale | Usable at game size. Replace with a high-res run cycle |
| `images/game/decoy-*.webp` (cupcake, chilli, nacho, chocolate) | ~115–166 px wide | Game decoys | Asset board A, cut out, upscaled | Good at game size |
| `images/mascot/koochu-excited.webp`, `koochu-oops.webp`, `koochu-win.webp` | ~280×330 | Game level-cleared, lost and win screens | Asset board A poses, cut out, 2.2× upscale | Usable small. Replace with high-res renders |
| `og/terra-utsav.jpg` | 1200×630 | Social share image (all pages) | HTML at `design/social/og.html`, screenshot with headless Chrome | Good. Re-render if event details change |
| `icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | | Web app manifest | Drawn (paw on maroon) | Good |
| `src/app/icon.svg`, `apple-icon.png`, `favicon.ico` | | Browser and home-screen icons | Drawn | Good |

## Drawn in code

| Component | Used for | Note |
|---|---|---|
| `BrickArt` | Brick challenge everywhere | Single wet clay brick with falling drops. Replace with a real photo of the challenge brick if wanted |
| `DiyaArt`, `DiyaRow`, `DiyaScene` | Diwali diyas section, menu card, hero, closings, loading states | Flickering flame, three colourways. **Replace the menu image with real photos of your homemade diyas** via /admin/menu |
| `RangoliArt` | Diyas section and scene | |
| `FestivalLights` | Top of every dark hero | Marigold toran, string lights, swaying kandils |
| `TwinkleStars` | Hero sky | Eco-friendly: twinkling stars instead of fireworks |
| `MapArt` | Find us card | Clearly captioned as an illustration; "Get directions" opens Google Maps for the venue |
| `OutfitOverlay` | Team mascot outfits (9 roles) | Accessories drawn over the locked render so the character never changes. Replace with full renders per person when possible |
| Game board (canvas) | Gift boxes, rangoli dots, toran, particles | |

## Still needed from the team

| Asset | Where it goes | How |
|---|---|---|
| Real photos of Chocolate Bomb and Chat Papdi | Menu, homepage | /admin/menu, upload; untick "illustrative" |
| Real photos of the homemade diyas | Menu, diyas section | /admin/menu |
| Photos of ~20 team members and 3 mentors (with consent) | Team page | /admin/team, tick consent |
| Personal Koochu Puchu renders (optional) | Team page | /admin/team "personal mascot art"; otherwise the role outfit is drawn |
| Approved homepage screenshot file | `design/reference/homepage-final.png` | It was shared in chat but could not be saved automatically |

## Prompts for the remaining renders

Use the locked reference (`design/generated/mascot-reference.png`, Canva media `MAHYWVGNswc`) as an image reference
every time, and repeat the locked traits:

> Koochu Puchu, the exact kitten from the reference image: a fluffy calico kitten with a white face, chest and paws,
> dark chocolate-brown tabby-striped patches over the ears, forehead and back, a fluffy striped tail, large glossy
> amber-brown eyes, a small pink nose and pink paw pads, wearing a maroon fabric headband with gold trim and a small
> gold teardrop ornament between the ears. Polished 3D animated-film character render, soft fur detail, warm golden
> key light from the upper left. Plain flat warm cream background. No text, no watermark, no logos.

Then add the pose or outfit, for example: "half-body portrait, chest up, facing the camera, wearing a white chef coat and a
small chef apron, holding a whisk". Outfits used on the site: chef (kitchen), event-crew jacket with lanyard
(operations), hoodie with camera (marketing), waistcoat with calculator (finance), sporty jersey with whistle (games),
utility vest (logistics), artist smock with brush (design), burgundy sherwani-style jacket with gold embroidery and
round spectacles (mentor), maroon crew t-shirt (generic).

For the hero at full resolution: "a cinematic wide illustration of a college Diwali food stall at night; Koochu Puchu
leaps in from the left third with a chocolate-covered paw over a cracked chocolate dome dessert; marigold garlands,
paper star lanterns and diyas; the centre and right two-thirds are softly blurred for a headline. No text."
