---
name: webgl-scroll-site
description: Build immersive scroll-driven 3D websites with three.js, Vite, and a post-processing chain - the award-site genre where scrolling drives a cinematic camera through chapters of procedural 3D scenes. Covers the architecture spine (virtual scroll, world stages, camera director), a headless screenshot verification loop with numeric QA, a catalogue of measured three.js/EffectComposer failure modes (black frames, rainbow banding, missing terrain), art direction for a coherent look, and how to parallelise the build across subagents. Use when asked to build, clone, study, or debug a WebGL/three.js scroll experience, a 3D landing page, a scrollytelling site, or when a three.js scene renders black, blown out, or saturated.
license: MIT
metadata:
  stack: three.js 0.169, vite 5, playwright, pillow
---

# WebGL Scroll Site

Build a scroll-driven 3D website: a fixed canvas where scrolling advances a
cinematic camera through several chapters of procedural three.js scenes, graded by
a post-processing chain.

**Core discipline: verify numerically, not visually.** These sites fail in ways
that look plausible in a screenshot and are obvious in a measurement — black
frames, blown highlights, hue banding, geometry erased by fog. Build the
measurement loop before you build the art.

## Setup

```bash
bash <skill-dir>/scripts/scaffold.sh ~/path/to/my-site
```

Creates the project, copies the proven spine into `src/core/`, installs `three` +
`vite`, and sets up a Python venv with Playwright and Pillow for verification.

## Workflow

1. **Recon (only when recreating an existing site).** Modern WebGL sites ship an
   empty `<body>` — scraping HTML yields nothing. Mine the JS bundle for the stack
   and palette, then drive a headless browser and screenshot at scroll increments.
   The frames are the real spec. -> [references/reconnaissance.md](references/reconnaissance.md)

2. **Write the contract before any 3D code.** Copy `CONTRACT.md` and fill in the
   chapters, palette, and measured value ranges. Everything downstream targets
   these numbers. -> `assets/CONTRACT.template.md`

3. **Own the spine yourself.** `src/core/{state,scroll,director,post}.js` is ~300
   lines and holds all the coupling. Define `CHAPTERS` in `state.js` and
   `STAGES`/`SHOTS` in `director.js`. -> [references/architecture.md](references/architecture.md)

4. **Build one module per chapter.** Each module owns exactly one file, builds
   around its local origin, and gates its own visibility. Parallelise across
   subagents if you have them. -> [references/delegation.md](references/delegation.md)

5. **Measure every change.**
   ```bash
   npm run build && npm run preview &
   .venv/bin/python capture.py http://localhost:4173/ shots 14
   .venv/bin/python check_frames.py shots
   ```
   -> [references/verification.md](references/verification.md)

6. **Grade the look last.** Exposure against measured background values, then
   albedos and lights, then post. -> [references/art-direction.md](references/art-direction.md)

## When something renders black or wrong

Go straight to [references/gotchas.md](references/gotchas.md). It catalogues
measured failures with symptom, cause, fix, and the diagnostic that proves it. The
five that cost the most time:

| Symptom | Cause |
|---|---|
| Entire frame black | `MeshPhysicalMaterial.transmission > 0` with an EffectComposer |
| Entire frame black | `UnrealBloomPass.resolution` mutated directly on resize |
| Entire frame black | `Post` constructed before the renderer was sized |
| Magenta/cyan/gold banding | An additive shader term exceeding 1.0 past the ACES shoulder |
| Distant geometry missing | `FogExp2` density far too high for the scene scale |

## Hard rules

- **Clamp additive shader terms.** Keep sums <= 1.0. This is the single most
  common cause of a ruined frame.
- **Never use `transmission` with a composer.** Fake glass/ice with envMap +
  clearcoat + fresnel.
- **Size the renderer before constructing post-processing.**
- **Treat any console error as a build failure** — shader link errors do not
  always change the picture, but they mean a material silently died.
- **Test once with no GPU flags.** `--use-angle` / `--enable-unsafe-swiftshader`
  can mask a failure that a real browser will hit.
- **Original work only.** Procedural geometry, original copy, original forms. When
  studying an existing site, recreate the technique — never rehost its assets,
  reproduce its copy, or clone branded characters.

## Files

| Path | What |
|---|---|
| `assets/spine/` | Working `state/scroll/director/post/main` + project config |
| `assets/CONTRACT.template.md` | Module contract to fill in per project |
| `scripts/scaffold.sh` | Create a new project from the spine |
| `scripts/capture.py` | Deterministic scroll screenshots via `window.__site` |
| `scripts/check_frames.py` | Numeric QA: saturation, black, flat detection |
