#!/usr/bin/env python3
"""Deterministic scroll-state screenshots of a WebGL scroll site.

Drives the virtual scroller directly through window.__site instead of
synthesising wheel events, so frames are reproducible. Fails loudly on any
console error or page error -- a silently black frame is the common failure.

Usage:
    python capture.py [url] [outdir] [n_frames]
    python capture.py http://localhost:4173/ shots 14
"""
import asyncio, sys, pathlib
from playwright.async_api import async_playwright


async def main(url="http://localhost:4173/", out="shots", n=14):
    n = int(n)
    pathlib.Path(out).mkdir(parents=True, exist_ok=True)
    errs = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=[
            "--use-gl=angle", "--use-angle=metal", "--enable-unsafe-swiftshader",
            "--ignore-gpu-blocklist", "--enable-gpu-rasterization"])
        pg = await browser.new_page(viewport={"width": 1440, "height": 900},
                                    device_scale_factor=1)
        pg.on("console", lambda m: errs.append(f"[{m.type}] {m.text}")
              if m.type == "error" else None)
        pg.on("pageerror", lambda e: errs.append(f"[pageerror] {e}"))

        await pg.goto(url, wait_until="networkidle", timeout=90000)
        await pg.wait_for_timeout(4000)

        booted = await pg.evaluate("!!window.__site")
        print("app booted:", booted, flush=True)
        if not booted:
            print("FATAL: window.__site missing -- main.js did not run.")
            await browser.close()
            return 1

        for i in range(n):
            s = i / (n - 1)
            await pg.evaluate(
                f"window.__site.scroller.target={s};"
                f"window.__site.scroller.current={s};")
            await pg.wait_for_timeout(1400)
            await pg.screenshot(path=f"{out}/f_{i:02d}.png")
        await browser.close()

    for e in errs[:40]:
        print("ERR", e)
    print("errors:", len(errs))
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main(*sys.argv[1:])) or 0)
