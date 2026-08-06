# Art Direction

How to reach a specific, coherent look instead of generic three.js output. The
recurring failure is not ugliness — it is everything collapsing to near-white or
near-black with saturated artefacts. This document is about controlling value and
saturation deliberately.

## Derive the palette from measurements

Do not guess hex codes. Sample reference frames (or your own target mood board)
with Pillow and record real numbers:

```python
from PIL import Image
im = Image.open("ref/frame_00.png").convert("RGB")
print([im.getpixel(p) for p in ((80,120),(720,430),(1360,700))])
```

Record four numbers in the contract and make every module target them:

| Role | Example (overcast arctic) |
|---|---|
| Background / sky | RGB 168-185 |
| Lit surfaces | RGB 200-215 |
| Shadowed surfaces | RGB 110-140 |
| Highlights | RGB 245-255 |

If you cannot state these numbers, you do not yet have an art direction.

## Value range discipline

Order of operations — do these in sequence, re-measuring after each:

1. **Exposure.** Set `renderer.toneMappingExposure` so the empty background lands
   on its target value. ACES lifts mid-greys, so the clear colour usually needs to
   be set *darker* than the intended result (e.g. clear `0x9aa3b2` to land near
   `#a8b0bd`). Starting point: `0.82`.
2. **Lights.** Overcast exteriors want a soft hemisphere plus one weak key:
   `HemisphereLight(sky, ground, 0.45)` and `DirectionalLight(0.9)`.
3. **Albedos.** Mid-grey, around `0.55-0.62` linear. A 0.9+ albedo with a 1.5 key
   light blows every surface to white — this is the classic "everything is a white
   void" failure.
4. **Post.** Grade last, never to rescue exposure.

## Saturation policy

For a neutral art direction, enforce it in the shader rather than hoping:

```glsl
float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
col = mix(col, vec3(lum), 0.9);     // 90% desaturated: no hue can survive
```

And clamp every additive term (see `gotchas.md` entry 5). Saturated magenta/cyan/
gold in a supposedly grey scene is always an over-bright additive term, never a
colour choice.

## Atmospheric perspective

The main depth cue in an exterior scene:

- Choose `FogExp2` density from the scene scale — see the density/distance table in
  `gotchas.md`. Too high erases your background entirely.
- Fade distant geometry toward the **background colour**, not toward grey.
- Layer elements at several depths, each progressively lighter and lower contrast.
  Two or three overlapping ranges read as vastly deeper than one.
- Add a low ground-haze band (large soft-alpha planes, very low opacity, slowly
  scrolling) to separate foreground from midground.

## Post-processing as grade, not spectacle

A chain that works, in order:

| Pass | Settings | Purpose |
|---|---|---|
| RenderPass | — | scene |
| UnrealBloomPass | strength 0.42, radius 0.85, **threshold 0.80** | only genuinely blown highlights glow |
| Grade ShaderPass | see below | the actual look |
| OutputPass | — | tone map + sRGB |

The grade shader, in one pass:

- **Edge-weighted radial blur** as faux DoF: strength ramps with `r^2`, ~9 taps.
- **Chromatic aberration**, tiny, growing toward the edges (~0.0002 + r^4 * 0.0014).
- **Monochrome grain**, ~0.035, animated by `uTime`.
- **Cool vignette that darkens.** An *additive* vignette washes mids out — multiply
  down, then tint slightly, do not add haze.
- **Gentle S-curve**, e.g. `mix(col, col*col*(3-2*col), 0.14)` plus a tiny lift.
  Avoid `col/(col+k)` style shoulders at high mix — they brighten mid-greys badly.
- **`uFlash` whiteout** driven by `state.flash` for chapter seams.

A high bloom threshold is what separates "cinematic" from "hazy mess".

## Materials that read as a substance

| Substance | Technique |
|---|---|
| Matte snow | mid-grey albedo, wide soft sheen, faint blue in creases from slope, sparse high-frequency sparkle glints that twinkle slowly |
| Backlit ice | envMap + clearcoat + strong fresnel rim + faint subsurface emissive. **Never `transmission`** with a composer |
| Engraved surface | a bright 1-2px hairline highlight *plus* a soft dark inner groove — the pair is what sells "cut into", not a drawn line |
| Granular form | dense point cloud sampled onto an SDF-union surface; fake AO from distance to the body axis; rim light from above; per-point luminance variation |
| Rock/ridge | steep-slope mask mixed toward a darker albedo, so faces read as exposed rock against snow |

## HUD / typographic language

The technical-diagram overlay that defines this genre:

- Monospace, ~11px, wide letter-spacing, near-white on a light scene.
- Thin 1px leader lines with small cross or dot markers at the anchor end; use an
  SVG overlay so lines can be diagonal.
- Small numeric readouts and pseudo-telemetry labels.
- Oversized very-low-opacity ghost text in the far background, parallaxing slightly
  with scroll.
- Everything fades in and out; nothing pops. `pointer-events: none` on all of it
  except genuine controls.

## Look checklist

- [ ] Background, lit, shadow, highlight values all match the contract's numbers
- [ ] Channel spread stays low across every frame (measured, not judged)
- [ ] No pure black anywhere; no blown white except intended highlights/seams
- [ ] At least three depth layers distinguishable by value
- [ ] Bloom affects only genuine highlights
- [ ] Each chapter is instantly distinguishable from the others
- [ ] HUD is legible against every chapter's background
