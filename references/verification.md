# Verification

How to prove a WebGL site is correct instead of guessing from screenshots. These
sites fail in ways that look plausible to the eye and are unambiguous in a
measurement. Build this loop before building the art — it is what turns "looks
about right" into a pass/fail gate.

## Why headless capture, not eyeballing

- Screenshots in an agent's context are expensive and stay expensive: every image
  keeps costing tokens on subsequent turns.
- The eye rationalises. A frame that is 30 RGB values too bright, or has a magenta
  contour in one corner, reads as "fine".
- Manual scrolling is not reproducible. Frames must be comparable across builds.

The app therefore exposes a handle, and the harness drives the scroller directly
rather than synthesising wheel events:

```js
window.__site = { scene, camera, renderer, modules, state, scroller, post };
```

```python
await pg.evaluate(f"window.__site.scroller.target={s};"
                  f"window.__site.scroller.current={s};")
```

Setting both `target` and `current` skips the damping so the frame is settled and
deterministic.

## The loop

```bash
npm run build                     # must resolve and bundle
npm run preview &                 # serve dist on :4173
.venv/bin/python capture.py http://localhost:4173/ shots 14
.venv/bin/python check_frames.py shots
```

`capture.py` fails loudly on any console or page error and exits non-zero.
`check_frames.py` exits non-zero if any frame fails a numeric check. Together they
are a CI gate you can run after every change.

## Numeric metrics that catch real bugs

| Metric | Computation | Fails when | Real cause |
|---|---|---|---|
| **channel spread** | `max(R,G,B) - min(R,G,B)` at probe points | > ~45 on a neutral art direction | additive shader term past the ACES shoulder -> hue banding |
| **mean luminance** | image mean | < ~12 | black frame: dead pass, `transmission`, bad sizing |
| **luminance stddev** | stddev of L | < ~4 | nothing rendered, or a whiteout flash stuck on |

Sample **several probe points** per frame, not one — a single centre sample misses
a corner blowout. Use fractional coordinates so the check is resolution independent:

```python
PROBES = [(0.06, 0.15), (0.28, 0.35), (0.50, 0.48), (0.73, 0.67), (0.94, 0.78)]
```

Tune thresholds to the art direction. A deliberately colourful site would raise the
spread threshold; the point is that the threshold is explicit and enforced.

## Console errors are a hard gate

A shader that fails to link does not necessarily change the picture — three falls
back and the frame still renders. Treat any console error as a build failure.

To get the full shader error including annotated source, capture console events and
print them unfiltered:

```python
pg.on("console", lambda m: errs.append(f"[{m.type}] {m.text}"))
pg.on("pageerror", lambda e: errs.append(f"[pageerror] {e}"))
```

three prints the failing line with context, e.g.
`ERROR: 0:196: 'flat' : syntax error` and
`FRAGMENT varying vObjPos does not match any VERTEX varying`. For a stack trace on
a runtime throw, print `e.stack`.

## Runtime probing recipes

Dump the scene graph state at a given scroll position:

```js
() => {
  const g = window.__site, r = {};
  r.chapter = g.state.chapter;
  r.cam = g.camera.position.toArray().map(v => +v.toFixed(2));
  r.mods = Object.fromEntries(Object.entries(g.modules).map(([k, m]) => [k, {
    vis: m.object3d?.visible,
    pos: m.object3d?.position.toArray().map(v => +v.toFixed(1)),
    kids: m.object3d?.children.length }]));
  return r;
}
```

List every material and the properties that commonly break rendering:

```js
() => { const out = [];
  window.__site.modules.cube.object3d.traverse(c => { if (c.material) out.push({
    type: c.material.type, transmission: c.material.transmission,
    transparent: c.material.transparent, blending: c.material.blending,
    env: !!c.material.envMap }); });
  return out; }
```

Toggle post passes to isolate a bad one:

```js
window.__site.post.composer.passes[1].enabled = false;   // bloom
window.__site.post.render = null;                        // bypass post entirely
```

## Comparing against reference frames

When recreating an existing look, capture the target at matched scroll depths into
`ref/`, then compare **numerically before visually**:

- background / lit / shadowed value ranges per frame,
- silhouette coverage: fraction of pixels below a luminance threshold in the centre
  region, which tells you whether the hero element is the right size in frame,
- channel spread, to confirm both are equally desaturated.

Only after the numbers are close is it worth spending context on side-by-side
images.

## Definition of done

Do not declare the site finished until all of these pass:

- [ ] `npm run build` succeeds with no unresolved imports
- [ ] Zero console errors and zero page errors across all captured frames
- [ ] Zero frames flagged BLACK
- [ ] Zero frames flagged FLAT (excluding intentional whiteout seams)
- [ ] Zero frames flagged SATURATED
- [ ] Every chapter is visibly distinct — no two frames are near-identical
- [ ] Value ranges match the contract's measured targets
- [ ] The site boots in a browser launched with **no GPU flags**
- [ ] Interaction works: wheel, touch, arrow keys, and pointer parallax

The GPU-flag check matters. Capturing with `--use-angle=metal` or
`--enable-unsafe-swiftshader` can hide a failure a real browser will hit. Run one
capture with a plain `chromium.launch(headless=True)` and no `args`.
