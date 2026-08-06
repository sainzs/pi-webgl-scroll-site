# Reconnaissance

How to study an existing immersive site to understand what to build. Read this only
when recreating or learning from a live site.

## Boundary — read first

Recreate the **design language and technical approach with original work**. That
means: your own procedural geometry, your own shaders, your own copy, your own
forms.

Do **not**:
- download, rehost, or embed the target's assets (models, textures, images, fonts,
  audio);
- reproduce its marketing copy or any substantial text;
- clone its branded characters, logos, or wordmarks.

Study the technique; build the thing yourself. If a form is recognisably somebody's
character or mark, design an abstract original instead.

## When the DOM is empty

Modern WebGL sites ship an empty `<body>` and one ES module:

```html
<body></body>
<script type="module" crossorigin src="/assets/index-<hash>.js"></script>
```

`curl` gives you nothing. Do not waste turns scraping HTML or waiting for
selectors — there is no content in the document. Two things carry the information:
**the bundle** and **rendered frames**.

## Bundle mining

The entry module is usually a small loader. Find the real chunk, then mine it.

```python
import httpx, re, collections
html = httpx.get(URL, follow_redirects=True,
                 headers={"User-Agent": "Mozilla/5.0"}).text
entry = re.findall(r'src="([^"]+\.js)"', html)[0]
js = httpx.get(urljoin(URL, entry)).text

# lazily-imported chunks
chunks = re.findall(r'[A-Za-z0-9_\-]+-[0-9a-f]{8}\.js', js)
app = httpx.get(urljoin(URL, "assets/" + chunks[0])).text
```

What to extract, and what each tells you:

| Regex | Reveals |
|---|---|
| `(three\|gsap\|ScrollTrigger\|EffectComposer\|GLTFLoader\|DRACO\|KTX2\|PMREM\|Reflector)` | the stack and which techniques are in play |
| `assets/[\w\-./]+\.(glb\|ktx2\|hdr\|webp\|woff2\|mp4)` | asset formats and pipeline (compressed textures, draco meshes) |
| `#(?:[0-9a-fA-F]{6})\b` + `collections.Counter` | the palette, frequency-ranked |
| `@font-face` / font filenames | typography |
| `"([ A-Za-z0-9'.,!?&\-:/]{4,60})"` | UI strings: section names, feature names, labels |

Frequency-ranked hex literals are the fastest way to a palette. Filtered UI strings
often expose the site's own chapter names and feature list (particle systems,
selective bloom, DOF, adaptive DPR), which tells you what to implement.

## Headless capture is the real spec

The bundle tells you *how*; only the frames tell you *what*.

```python
pg = await browser.new_page(viewport={"width":1440,"height":900})
await pg.goto(URL, wait_until="networkidle", timeout=120000)
await pg.wait_for_timeout(12000)               # let assets and the intro settle
await pg.screenshot(path="ref/ref_00.png")
for i in range(1, 14):
    for _ in range(9):                          # many small wheel events
        await pg.mouse.wheel(0, 320)
        await pg.wait_for_timeout(90)
    await pg.wait_for_timeout(2200)             # let easing settle
    await pg.screenshot(path=f"ref/ref_{i:02d}.png")
```

Notes that matter:
- Send **many small wheel deltas**, not one big one — virtual scrollers clamp and
  damp, and a single large delta skips content.
- Wait after each step; these sites ease over 1-2 seconds.
- Generous initial wait: heavy sites stream assets before the intro completes.

**The most important thing to identify is the scroll MECHANIC** — what scrolling
actually does to the scene. Is it a camera path? An assembly animation? A morph? A
sequence of discrete scenes? In one real case, scrolling assembled a structure
brick by brick; no amount of bundle reading would have revealed that, and it became
the centrepiece of the build.

## Turning frames into a build plan

For each captured frame, record:

| Column | Example |
|---|---|
| Chapter | hero |
| Camera relationship | distant 3/4, slow push-in |
| Hero element | structure assembling from scattered parts |
| Materials | matte snow bricks, glowing interior |
| HUD | wordmark, manifesto block, plexus markers |
| Transition out | whiteout |

Then map one row -> one module -> one chapter range in `state.js`, and one entry in
the Director's `SHOTS`. That table *is* your build plan and the source of every
worker brief.

## Measure the target numerically

Pull the palette and value range out of the frames rather than eyeballing:

```python
from PIL import Image, ImageStat
im = Image.open("ref/ref_00.png").convert("RGB")
print("mean", ImageStat.Stat(im).mean)
print("probe", [im.getpixel(p) for p in ((80,120),(720,430),(1360,700))])
```

Put those numbers straight into `CONTRACT.md` as the target value ranges. Every
module then has an objective target, and `check_frames.py` can enforce it.

## Worked example

1. `curl` the page -> empty body, one module. Stop scraping.
2. Fetch entry (16 KB loader) -> find one lazily-imported chunk.
3. Fetch chunk (1.5 MB) -> confirms three.js + GSAP/ScrollTrigger + EffectComposer +
   DRACO/KTX2; palette dominated by icy blue-greys; UI strings reveal section names
   and features like GPU particles and selective bloom.
4. Headless capture, 14 frames -> five distinct chapters; scrolling assembles the
   hero structure; transitions are whiteouts.
5. Measure frames -> background RGB ~168-185, lit ~200-215, shadow ~110-140.
6. Write `CONTRACT.md` with those numbers and the five chapter ids.
7. Write the spine; set `CHAPTERS`, `STAGES`, `SHOTS`.
8. One module per chapter; build, capture, measure, iterate.
