"""
Crop team photos to consistent 4:5 headshots centred on the face.

    python -I scripts/assets/team_photos.py <dir with page-NN-img-01.*> <out dir in public/images/team>

Photo N (page N of the team PDF) becomes member-NN-real.webp. Uses OpenCV's bundled face
detector; when no face is found it falls back to the top-centre of the photo.
"""

import glob
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageOps

OUT_W, OUT_H = 800, 1000

# Hand-set boxes (left, top, right, bottom) for photos the automatic finder frames too wide:
# full-length or office-background shots.
OVERRIDES = {
    1: (388, 298, 1092, 1178),
    13: (323, 128, 1027, 1008),
}
FACE_SHARE = 0.34  # face height as a share of the crop height
FACE_Y = 0.40  # face centre position from the top of the crop


def detect_face(img: np.ndarray):
    """
    Find the face in a studio portrait without a trained model: skin-tone pixels (YCrCb range),
    then the largest connected skin region in the upper 70% of the photo, trimmed to the head
    (the region's width near its top approximates the face width).
    """
    h0, w0 = img.shape[:2]
    scale = 240 / max(h0, w0)
    small = cv2.resize(img, (max(1, round(w0 * scale)), max(1, round(h0 * scale))), interpolation=cv2.INTER_AREA)
    ycc = cv2.cvtColor(small, cv2.COLOR_RGB2YCrCb)
    cr, cb = ycc[..., 1].astype(int), ycc[..., 2].astype(int)
    skin = ((cr >= 135) & (cr <= 175) & (cb >= 80) & (cb <= 127)).astype(np.uint8)
    skin[int(skin.shape[0] * 0.7):, :] = 0
    skin = cv2.morphologyEx(skin, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(skin, connectivity=8)
    if n <= 1:
        return None
    # Largest region whose top is in the upper half: the face (with neck).
    best = None
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        if area < 40 or y > skin.shape[0] * 0.5:
            continue
        if best is None or area > best[4]:
            best = (x, y, w, h, area)
    if best is None:
        return None
    x, y, w, h, _ = best
    # Face height ~ 1.3 x face width; the region often includes the neck, so cap it.
    rows = np.where(labels[y : y + h, x : x + w] > 0)
    face_h = min(h, int(w * 1.35))
    return x / scale, y / scale, w / scale, face_h / scale


def crop_box(width: int, height: int, face):
    if face is None:
        ch = min(height, width * OUT_H / OUT_W)
        cw = ch * OUT_W / OUT_H
        return (width - cw) / 2, 0, (width + cw) / 2, ch
    fx, fy, fw, fh = face
    ch = fh / FACE_SHARE
    cw = ch * OUT_W / OUT_H
    # Never crop past the photo; shrink while keeping the face centred where possible.
    scale = min(1.0, width / cw, height / ch)
    cw, ch = cw * scale, ch * scale
    cx = fx + fw / 2
    cy = fy + fh / 2
    left = min(max(cx - cw / 2, 0), width - cw)
    top = min(max(cy - ch * FACE_Y, 0), height - ch)
    return left, top, left + cw, top + ch


def main() -> int:
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    files = sorted(glob.glob(os.path.join(src, "page-*-img-01.*")))
    for i, path in enumerate(files, start=1):
        im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
        face = detect_face(np.asarray(im))
        box = OVERRIDES.get(i) or crop_box(im.width, im.height, face)
        crop = im.crop(tuple(round(v) for v in box)).resize((OUT_W, OUT_H), Image.Resampling.LANCZOS)
        dest = os.path.join(out, f"member-{i:02d}-real.webp")
        crop.save(dest, "WEBP", quality=82, method=6)
        print(f"{os.path.basename(path)} -> {os.path.basename(dest)}  face={'yes' if face else 'NO'}  {os.path.getsize(dest) // 1024} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
