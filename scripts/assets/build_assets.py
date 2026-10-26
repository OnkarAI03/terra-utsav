"""
Build the website's raster assets from the design sources.

Sources (all in design/):
  generated/mascot-reference.png   1264px Mini render (Canva AI, locked character reference)
  reference/*.webp                 the team's approved concept art and asset boards

Outputs go to public/images/. Run from the project root:

    python -I scripts/assets/build_assets.py

Needs Pillow and numpy only. Every output is listed in docs/ASSET_MANIFEST.md with its source.
Crops never include baked-in text from the reference boards.
"""

from __future__ import annotations

import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
REF = os.path.join(ROOT, "design", "reference")
GEN = os.path.join(ROOT, "design", "generated")
OUT = os.path.join(ROOT, "public", "images")


def out(*parts: str) -> str:
    path = os.path.join(OUT, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


# ---------------------------------------------------------------- colour maths

def srgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    """rgb: float array (..., 3) in 0..255 -> CIE Lab (D65)."""
    c = rgb / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m = np.array(
        [
            [0.4124564, 0.3575761, 0.1804375],
            [0.2126729, 0.7151522, 0.0721750],
            [0.0193339, 0.1191920, 0.9503041],
        ]
    )
    xyz = c @ m.T
    xyz /= np.array([0.95047, 1.0, 1.08883])
    eps = 216 / 24389
    k = 24389 / 27
    f = np.where(xyz > eps, np.cbrt(xyz), (k * xyz + 16) / 116)
    lab = np.empty_like(xyz)
    lab[..., 0] = 116 * f[..., 1] - 16
    lab[..., 1] = 500 * (f[..., 0] - f[..., 1])
    lab[..., 2] = 200 * (f[..., 1] - f[..., 2])
    return lab


def fit_background(rgb: np.ndarray, band: int = 10) -> np.ndarray:
    """Model a smooth studio background with a quadratic surface fitted to the border band."""
    h, w, _ = rgb.shape
    mask = np.zeros((h, w), bool)
    mask[:band, :] = mask[-band:, :] = True
    mask[:, :band] = mask[:, -band:] = True
    ys, xs = np.nonzero(mask)
    xn, yn = xs / w, ys / h
    a = np.stack([np.ones_like(xn), xn, yn, xn * xn, yn * yn, xn * yn], 1)
    gy, gx = np.mgrid[0:h, 0:w]
    gxn, gyn = gx / w, gy / h
    full = np.stack([np.ones_like(gxn), gxn, gyn, gxn * gxn, gyn * gyn, gxn * gyn], -1)
    bg = np.empty_like(rgb)
    for ch in range(3):
        coef, *_ = np.linalg.lstsq(a, rgb[ys, xs, ch], rcond=None)
        bg[..., ch] = full @ coef
    return bg


def border_connected(mask: np.ndarray) -> np.ndarray:
    """Pixels of `mask` connected (4-way) to the image border."""
    h, w = mask.shape
    seen = np.zeros_like(mask)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if mask[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if mask[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


def components(mask: np.ndarray, min_area: int = 30) -> list[tuple[int, int, int, int, int]]:
    """Connected components (8-way) as (x0, y0, x1, y1, area), sorted left to right."""
    h, w = mask.shape
    seen = np.zeros_like(mask)
    found = []
    for y0 in range(h):
        for x0 in range(w):
            if not mask[y0, x0] or seen[y0, x0]:
                continue
            q = deque([(y0, x0)])
            seen[y0, x0] = True
            minx = maxx = x0
            miny = maxy = y0
            area = 0
            while q:
                y, x = q.popleft()
                area += 1
                minx, maxx = min(minx, x), max(maxx, x)
                miny, maxy = min(miny, y), max(maxy, y)
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            q.append((ny, nx))
            if area >= min_area:
                found.append((minx, miny, maxx + 1, maxy + 1, area))
    found.sort(key=lambda c: c[0])
    return found


def cutout(img: Image.Image, lo: float, hi: float, smooth_bg: bool = True, feather: float = 0.8) -> Image.Image:
    """Remove a light studio background. Returns RGBA with decontaminated edges."""
    rgb = np.asarray(img.convert("RGB"), dtype=np.float64)
    if smooth_bg:
        bg = fit_background(rgb)
    else:
        h, w, _ = rgb.shape
        border = np.concatenate([rgb[:4].reshape(-1, 3), rgb[-4:].reshape(-1, 3), rgb[:, :4].reshape(-1, 3), rgb[:, -4:].reshape(-1, 3)])
        bg = np.broadcast_to(np.median(border, 0), rgb.shape).copy()
    dist = np.linalg.norm(srgb_to_lab(rgb) - srgb_to_lab(bg), axis=-1)
    outside = border_connected(dist < hi)
    alpha = np.ones(dist.shape)
    ramp = np.clip((dist - lo) / (hi - lo), 0, 1)
    alpha[outside] = ramp[outside]
    a_img = Image.fromarray((alpha * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(feather))
    alpha = np.asarray(a_img, dtype=np.float64) / 255
    # Decontaminate: remove the background colour that bled into semi-transparent edge pixels.
    safe = np.maximum(alpha, 0.08)[..., None]
    fg = np.clip((rgb - (1 - safe) * bg) / safe, 0, 255)
    rgba = np.dstack([np.where(alpha[..., None] > 0.98, rgb, fg), alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def _shift(mask: np.ndarray, dy: int, dx: int, fill: bool) -> np.ndarray:
    out_ = np.full_like(mask, fill)
    h, w = mask.shape
    ys = slice(max(dy, 0), h + min(dy, 0))
    yd = slice(max(-dy, 0), h + min(-dy, 0))
    xs = slice(max(dx, 0), w + min(dx, 0))
    xd = slice(max(-dx, 0), w + min(-dx, 0))
    out_[ys, xs] = mask[yd, xd]
    return out_


def erode(mask: np.ndarray, r: int) -> np.ndarray:
    m = mask.copy()
    for _ in range(r):
        m = m & _shift(m, 1, 0, True) & _shift(m, -1, 0, True) & _shift(m, 0, 1, True) & _shift(m, 0, -1, True)
    return m


def dilate_within(seed: np.ndarray, limit: np.ndarray, r: int) -> np.ndarray:
    m = seed.copy()
    for _ in range(r):
        m = (m | _shift(m, 1, 0, False) | _shift(m, -1, 0, False) | _shift(m, 0, 1, False) | _shift(m, 0, -1, False)) & limit
    return m


def cutout_studio(
    img: Image.Image, hi: float, block: int, choke: int, feather: float, shadow_from: float, flat_bg: bool = False
) -> Image.Image:
    """
    Cut a character out of a smooth studio background.

    - The background is modelled as a quadratic surface fitted to the border.
    - Background = pixels within `hi` (Delta E) of the model AND connected to the border through
      channels wider than 2*block+1 px (blocks leaks into pale fur through thin gaps).
    - The edge is choked by `choke` px and feathered, then edge colours are decontaminated.
    - Below `shadow_from` (fraction of height), background-hued pixels darker than the model become
      a neutral transparent contact shadow instead of a cream smudge.
    """
    rgb = np.asarray(img.convert("RGB"), dtype=np.float64)
    if flat_bg:
        border = np.concatenate([rgb[:3].reshape(-1, 3), rgb[-3:].reshape(-1, 3), rgb[:, :3].reshape(-1, 3), rgb[:, -3:].reshape(-1, 3)])
        bg = np.broadcast_to(np.median(border, 0), rgb.shape).copy()
    else:
        bg = fit_background(rgb)
    lab = srgb_to_lab(rgb)
    lab_bg = srgb_to_lab(bg)
    dist = np.linalg.norm(lab - lab_bg, axis=-1)
    cand = dist < hi
    seeds = border_connected(erode(cand, block))
    outside = dilate_within(seeds, cand, block + 1)
    fg = ~outside
    fg = erode(fg, choke)
    alpha_img = Image.fromarray((fg * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(feather))
    alpha = np.asarray(alpha_img, dtype=np.float64) / 255

    h = rgb.shape[0]
    rows = np.arange(h)[:, None] >= int(h * shadow_from)
    d_ab = np.hypot(lab[..., 1] - lab_bg[..., 1], lab[..., 2] - lab_bg[..., 2])
    darker = lab_bg[..., 0] - lab[..., 0]
    # Floor shadow: background-hued, darker than the model, reachable from the background.
    shadow_cand = rows & (d_ab < 6.5) & (darker > -1.0)
    shadow_zone = dilate_within(outside & rows, shadow_cand | (outside & rows), 40)
    alpha = np.where(shadow_zone, 0.0, alpha)
    shadow_alpha = np.clip(darker / 26, 0, 0.5)

    safe = np.maximum(alpha, 0.1)[..., None]
    clean = np.clip((rgb - (1 - safe) * bg) / safe, 0, 255)
    colour = np.where(alpha[..., None] > 0.97, rgb, clean)
    colour = np.where(shadow_zone[..., None], np.array([24.0, 8.0, 6.0]), colour)
    final_alpha = np.where(shadow_zone, shadow_alpha, alpha)
    rgba = np.dstack([colour, final_alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def keep_largest(rgba: Image.Image, threshold: int = 128) -> Image.Image:
    a = np.asarray(rgba)[..., 3] > threshold
    comps = components(a, min_area=1)
    if not comps:
        return rgba
    big = max(comps, key=lambda c: c[4])
    arr = np.asarray(rgba).copy()
    keep = np.zeros(a.shape, bool)
    x0, y0, x1, y1, _ = big
    keep[y0:y1, x0:x1] = True
    arr[..., 3] = np.where(keep, arr[..., 3], 0)
    return Image.fromarray(arr, "RGBA")


def trim(rgba: Image.Image, pad: int = 6) -> Image.Image:
    box = rgba.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if not box:
        return rgba
    x0, y0, x1, y1 = box
    return rgba.crop((max(0, x0 - pad), max(0, y0 - pad), min(rgba.width, x1 + pad), min(rgba.height, y1 + pad)))


def upscale(img: Image.Image, factor: float, sharpen: bool = True) -> Image.Image:
    w, h = img.size
    big = img.resize((round(w * factor), round(h * factor)), Image.Resampling.LANCZOS)
    if sharpen:
        if big.mode == "RGBA":
            rgb = big.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.6, percent=70, threshold=2))
            rgb.putalpha(big.getchannel("A"))
            big = rgb
        else:
            big = big.filter(ImageFilter.UnsharpMask(radius=1.6, percent=70, threshold=2))
    return big


def fit_long_edge(img: Image.Image, long_edge: int) -> Image.Image:
    w, h = img.size
    scale = long_edge / max(w, h)
    if scale >= 1:
        return img
    return img.resize((round(w * scale), round(h * scale)), Image.Resampling.LANCZOS)


def save_webp(img: Image.Image, path: str, quality: int = 82) -> None:
    img.save(path, "WEBP", quality=quality, method=6)
    print(f"  {os.path.relpath(path, ROOT)}  {img.size[0]}x{img.size[1]}  {os.path.getsize(path) // 1024} KB")


# ---------------------------------------------------------------- builds

def build_mascot() -> None:
    print("Mascot (locked character reference)")
    src = Image.open(os.path.join(GEN, "mascot-reference.png"))
    cut = cutout_studio(src, hi=4.5, block=3, choke=3, feather=1.2, shadow_from=0.84)
    cut = trim(cut, pad=10)
    save_webp(fit_long_edge(cut, 1000), out("mascot", "koochu-idle.webp"), 86)
    # Head and shoulders for the game's pop-up target and small avatars.
    w, h = cut.size
    head = cut.crop((0, 0, w, round(h * 0.62)))
    save_webp(fit_long_edge(trim(head, 4), 520), out("game", "koochu-peek.webp"), 86)
    # Opaque cream version for cards (no edge halo at small sizes).
    cream = Image.new("RGBA", src.size, (246, 228, 204, 255))
    cream.alpha_composite(src.convert("RGBA"))
    save_webp(fit_long_edge(cream.convert("RGB"), 900), out("mascot", "koochu-idle-cream.webp"), 84)


def build_board_sprites() -> None:
    print("Game sprites (asset board A, row 06)")
    board = Image.open(os.path.join(REF, "asset-board-a.webp")).convert("RGB")
    strip = board.crop((10, 474, 1500, 566))
    cut = cutout_studio(strip, hi=12.0, block=1, choke=1, feather=0.6, shadow_from=0.86, flat_bg=True)
    alpha = np.asarray(cut)[..., 3] > 110
    comps = components(alpha, min_area=120)
    print("  components:", [(c[0], c[1], c[2], c[3]) for c in comps])
    names = {
        "run-1": (0, 100),
        "run-2": (100, 200),
        "decoy-cupcake": (405, 475),
        "decoy-chilli": (475, 555),
        "decoy-nacho": (555, 615),
        "decoy-chocolate": (615, 700),
    }
    for name, (x0, x1) in names.items():
        piece = cut.crop((x0, 0, x1, cut.height))
        piece = trim(keep_largest(piece), pad=3)
        piece = upscale(piece, 2.4)
        save_webp(piece, out("game", f"{name}.webp"), 88)


def build_board_poses() -> None:
    print("Mascot poses (asset board A, row 02)")
    board = Image.open(os.path.join(REF, "asset-board-a.webp")).convert("RGB")
    row = board.crop((598, 28, 1498, 198))
    cut = cutout_studio(row, hi=12.0, block=1, choke=1, feather=0.6, shadow_from=0.88, flat_bg=True)
    # Only the "oops" pose is still used (404 page). The excited and trophy poses were retired:
    # their white fur is the same colour as the board's cream background, so the cut-out leaked
    # into the face. The game's result screens now use the full-resolution mascot instead.
    poses = {
        "koochu-oops": (632, 755),
    }
    for name, (x0, x1) in poses.items():
        piece = trim(keep_largest(cut.crop((x0, 0, x1, cut.height))), pad=3)
        save_webp(upscale(piece, 2.2), out("mascot", f"{name}.webp"), 88)


def build_hero_and_scenes() -> None:
    print("Hero and scene crops (approved concept art)")
    hc = Image.open(os.path.join(REF, "hero-concept-a.webp")).convert("RGB")
    scene = hc.crop((700, 0, 1360, 790))
    save_webp(upscale(scene, 1.8), out("scenes", "koochu-chocolate-bomb.webp"), 80)

    # The approved homepage art, cropped to the kitten only (its baked-in note and logo excluded).
    hp = Image.open(os.path.join(REF, "homepage-approved.webp")).convert("RGB")
    paw = hp.crop((250, 40, 598, 560))
    save_webp(upscale(paw, 2.0), out("scenes", "koochu-paw.webp"), 80)

    # Soft festival bokeh for backdrops: the concept art blurred far past legibility.
    backdrop = hc.resize((768, 512), Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(26))
    dark = Image.new("RGB", backdrop.size, (42, 9, 14))
    backdrop = Image.blend(backdrop, dark, 0.35)
    save_webp(backdrop.resize((1280, 853), Image.Resampling.BICUBIC), out("hero", "festival-bokeh.webp"), 70)


def build_food() -> None:
    print("Food (illustrative crops from approved concept art)")
    hp = Image.open(os.path.join(REF, "homepage-approved.webp")).convert("RGB")
    bomb = hp.crop((0, 500, 400, 1000))
    save_webp(upscale(bomb, 2.0), out("food", "chocolate-bomb.webp"), 82)
    # Aloo Ponga (images/food/aloo-ponga.webp) is the team's own photo, not built from concept art.


def build_logo() -> None:
    """The team's TERRA UTSAV logo (design/brand/terra-utsav-logo-source.jpg, flat cream ground).

    Cropped to the artwork with an even cream margin. The cream stays: the logo is shown as a
    printed sign or on cream surfaces, where `mix-blend-mode: multiply` hides the ground.
    """
    print("Logo")
    src = Image.open(os.path.join(ROOT, "design", "brand", "terra-utsav-logo-source.jpg")).convert("RGB")
    a = np.asarray(src, dtype=np.int32)
    border = np.concatenate([a[:20].reshape(-1, 3), a[-20:].reshape(-1, 3), a[:, :20].reshape(-1, 3), a[:, -20:].reshape(-1, 3)])
    bg = np.median(border, 0)
    ys, xs = np.where(np.abs(a - bg).sum(-1) > 40)
    pad = 56
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(src.width, xs.max() + pad), min(src.height, ys.max() + pad))
    logo = src.crop(box)
    save_webp(logo, out("brand", "terra-utsav-logo.webp"), 90)


def main() -> int:
    targets = sys.argv[1:] or ["mascot", "sprites", "poses", "scenes", "food", "logo"]
    steps = {
        "logo": build_logo,
        "mascot": build_mascot,
        "sprites": build_board_sprites,
        "poses": build_board_poses,
        "scenes": build_hero_and_scenes,
        "food": build_food,
    }
    for t in targets:
        steps[t]()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
