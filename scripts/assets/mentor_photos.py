"""
Mentor portraits for the team page. Mentors 1 to 3 were supplied as a 3-page PDF on 2026-10-18,
one photo per page, in the order Ankush, Jidnyesh, Sairaj. Mentor 4, Giriraj, was supplied as a
single photo on 2026-10-20.

    python -I scripts/assets/mentor_photos.py <dir with page-0N-img-01.png> public/images/team
    python -I scripts/assets/mentor_photos.py --photo <photo.jpg> 4 public/images/team

Reuses the face finder from team_photos.py and writes square, face-centred 480 px WebP crops
(mentor-01.webp ...), since mentors appear as a compact row rather than full cards.
"""

from __future__ import annotations

import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from team_photos import detect_face  # noqa: E402

# Checked by eye: mentor 1's skin region ran wide, mentor 2 needed headroom, and mentor 4's skin
# region took in the neck, which left the head small; these match the framing of the others.
OVERRIDES = {1: (255, 40, 1155, 940), 2: (0, 110, 1500, 1610), 4: (105, 118, 985, 998)}

FACE_SHARE = 0.42  # face height as a share of the square
FACE_Y = 0.44  # face centre from the top


def square_box(width: int, height: int, face) -> tuple[int, int, int, int]:
    fx, fy, fw, fh = face
    side = min(width, height, max(fh / FACE_SHARE, fw / 0.36))
    cx = fx + fw / 2
    cy = fy + fh / 2
    left = min(max(0, cx - side / 2), width - side)
    top = min(max(0, cy - side * FACE_Y), height - side)
    return round(left), round(top), round(left + side), round(top + side)


def crop_mentor(path: str, i: int, out: str) -> None:
    img = Image.open(path).convert("RGB")
    face = detect_face(np.asarray(img))
    if i in OVERRIDES:
        box = OVERRIDES[i]
    elif face is None:
        print(f"mentor {i}: no face found, centre crop")
        side = min(img.size)
        box = ((img.width - side) // 2, 0, (img.width + side) // 2, side)
    else:
        box = square_box(img.width, img.height, face)
    crop = img.crop(box).resize((480, 480), Image.Resampling.LANCZOS)
    dest = os.path.join(out, f"mentor-{i:02d}.webp")
    crop.save(dest, "WEBP", quality=84, method=6)
    print(f"mentor {i}: face {face} box {box} -> {dest}")


def main() -> int:
    if sys.argv[1] == "--photo":
        path, i, out = sys.argv[2], int(sys.argv[3]), sys.argv[4]
        os.makedirs(out, exist_ok=True)
        crop_mentor(path, i, out)
        return 0
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    for i in (1, 2, 3):
        crop_mentor(os.path.join(src, f"page-0{i}-img-01.png"), i, out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
