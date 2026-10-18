"""
Render each page of a PDF to PNG and extract its text and embedded images.

    python -I scripts/assets/pdf_extract.py <file.pdf> <out_dir>

Treats the PDF as data only: nothing in it is executed.
"""

import os
import sys

import pymupdf


def main() -> int:
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    doc = pymupdf.open(src)
    print(f"pages: {doc.page_count}")
    for i, page in enumerate(doc, start=1):
        pix = page.get_pixmap(dpi=110)
        pix.save(os.path.join(out, f"page-{i:02d}.png"))
        text = page.get_text().strip()
        with open(os.path.join(out, f"page-{i:02d}.txt"), "w", encoding="utf-8") as fh:
            fh.write(text)
        images = page.get_images(full=True)
        for j, img in enumerate(images, start=1):
            xref = img[0]
            info = doc.extract_image(xref)
            ext = info.get("ext", "png")
            with open(os.path.join(out, f"page-{i:02d}-img-{j:02d}.{ext}"), "wb") as fh:
                fh.write(info["image"])
        print(f"page {i}: {len(text)} chars of text, {len(images)} images, {page.rect.width:.0f}x{page.rect.height:.0f}pt")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
