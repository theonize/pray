#!/usr/bin/env python3
"""Generate the PWA app icons (a warm gold Latin cross on deep charcoal).

Produces:
  public/icons/icon-192.png
  public/icons/icon-512.png
  public/icons/maskable-512.png   (full-bleed, safe-zone padding)
  public/icons/apple-touch-icon.png (180x180)

Run with:  python3 scripts/gen-icons.py   (or `npm run icons`)
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "icons")
os.makedirs(OUT, exist_ok=True)

BG = (43, 36, 38, 255)        # deep warm charcoal  #2b2426
BG2 = (58, 48, 50, 255)       # subtle highlight
GOLD = (227, 192, 128, 255)   # warm gold           #e3c080
GOLD_HI = (242, 214, 161, 255)


def _vertical_gradient(size, top, bottom):
    grad = Image.new("RGBA", (1, size))
    for y in range(size):
        t = y / max(1, size - 1)
        grad.putpixel(
            (0, y),
            tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(4)),
        )
    return grad.resize((size, size))


def draw_icon(size, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if maskable:
        img.paste(_vertical_gradient(size, BG2, BG), (0, 0))
        pad = size * 0.26          # generous safe zone for maskable
    else:
        radius = int(size * 0.225)
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BG)
        # paste a gradient clipped to the rounded square
        grad = _vertical_gradient(size, BG2, BG)
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, size - 1, size - 1], radius=radius, fill=255
        )
        img.paste(grad, (0, 0), mask)
        d = ImageDraw.Draw(img)
        pad = size * 0.24

    cx = size / 2
    top = pad
    bottom = size - pad
    height = bottom - top
    thickness = size * 0.082
    r = thickness * 0.45

    # horizontal bar sits in the upper third (Latin cross)
    arm_y = top + height * 0.34
    half_span = size * 0.205

    # vertical beam
    d.rounded_rectangle(
        [cx - thickness / 2, top, cx + thickness / 2, bottom],
        radius=r, fill=GOLD,
    )
    # horizontal beam
    d.rounded_rectangle(
        [cx - half_span, arm_y - thickness / 2, cx + half_span, arm_y + thickness / 2],
        radius=r, fill=GOLD,
    )
    # tiny highlight on the crossing
    hl = thickness * 0.30
    d.ellipse([cx - hl, arm_y - hl, cx + hl, arm_y + hl], fill=GOLD_HI)
    return img


def main():
    draw_icon(192).save(os.path.join(OUT, "icon-192.png"))
    draw_icon(512).save(os.path.join(OUT, "icon-512.png"))
    draw_icon(512, maskable=True).save(os.path.join(OUT, "maskable-512.png"))
    draw_icon(180).save(os.path.join(OUT, "apple-touch-icon.png"))
    print("Icons written to", OUT)


if __name__ == "__main__":
    main()
