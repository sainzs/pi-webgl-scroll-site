#!/usr/bin/env python3
"""Numeric QA over captured frames. Catches the failures your eyes rationalise.

Three automated checks, each tied to a real failure mode:

  spread  -- max per-pixel channel spread (max(R,G,B) - min(R,G,B)).
             High spread on a desaturated art direction means an additive
             shader term blew past the tone-mapping shoulder into hue banding.
  dark    -- frame is essentially black: a broken pass or material.
  flat    -- frame has almost no tonal variation: nothing rendered, or a
             whiteout is stuck on.

Usage:
    python check_frames.py shots [max_spread]
Exit code is non-zero if any frame fails, so it works in a verify loop.
"""
import sys, pathlib
from PIL import Image, ImageStat

PROBES = [(0.06, 0.15), (0.28, 0.35), (0.50, 0.48), (0.73, 0.67), (0.94, 0.78)]


def analyse(path):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = [im.getpixel((int(x * w), int(y * h))) for x, y in PROBES]
    spread = max(max(c) - min(c) for c in px)
    mean = ImageStat.Stat(im).mean
    stddev = ImageStat.Stat(im.convert("L")).stddev[0]
    return spread, sum(mean) / 3, stddev


def main(d="shots", max_spread=45):
    max_spread = int(max_spread)
    files = sorted(pathlib.Path(d).glob("*.png"))
    if not files:
        print(f"no frames in {d}/")
        return 1
    bad = []
    for f in files:
        spread, mean, sd = analyse(f)
        flags = []
        if spread > max_spread: flags.append("SATURATED")
        if mean < 12:           flags.append("BLACK")
        if sd < 4:              flags.append("FLAT")
        if flags: bad.append(f.name)
        print(f"{f.name}  spread={spread:3d}  mean={mean:6.1f}  sd={sd:5.1f}  "
              f"{' '.join(flags)}")
    print(f"\n{len(files) - len(bad)}/{len(files)} frames pass")
    if bad:
        print("FAILING:", ", ".join(bad))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:]))
