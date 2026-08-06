# Module contract — <PROJECT NAME>

Every module author (human or agent) reads this file first. Fill in the bracketed
sections before writing any module.

## Ground rules
- Everything is **procedurally generated in code**. No third-party assets: no
  GLB/GLTF, textures, images, HDRIs, or fonts beyond system/Google fonts.
- Do not copy any external site's copy, assets, or branded characters. Write
  original text and design original forms.
- `three` ^0.169 (`import * as THREE from 'three'`). Vanilla ESM. Vite.
  No new npm dependencies. No TypeScript.

## Interface — every scene module

```js
import * as THREE from 'three';
export class X {
  constructor(ctx) {}            // ctx = { THREE, scene, camera, renderer }
  get object3d() {}              // THREE.Object3D root
  update(time, dt, state) {}     // every frame
  resize(sizes) {}               // optional, { w, h, dpr }
  dispose() {}                   // optional
}
```

- Build geometry around the **local origin**, ground plane at **y = 0**.
  The Director places your root at its world stage. Never set your own world
  position, never touch the camera.
- Only mutate objects you created. Never edit another module, `src/core/*`,
  `src/main.js`, or `index.html`.
- Hide yourself off-chapter: `this.object3d.visible = chapterWindow(id) > 0.001`.

## Shared helpers — `src/core/state.js`
```js
import { state, chapterProgress, chapterWindow, clamp, lerp, smoothstep, damp }
  from '../core/state.js';
```
`chapterProgress(id)` -> 0..1 within your chapter. `chapterWindow(id, fade)` -> 0..1
visibility envelope. Plus `state.scroll`, `state.time`, `state.pointer.nx/ny`,
`state.sizes`, `state.velocity`.

Chapters in order: `<LIST YOUR CHAPTER IDS>`

## Art direction (strict)
- Palette: background `<HEX>`, lights `<HEX>`, shadows `<HEX>`, accent `<HEX>`.
- Target value range, measured from reference frames:
  background ~RGB `<N>`, lit surfaces ~RGB `<N>`, shadowed ~RGB `<N>`.
- `<Saturation policy — e.g. "fully desaturated; no hue may survive">`
- `<Lighting mood — e.g. "overcast, high-key, heavy atmospheric perspective">`

## Shader discipline (non-negotiable — these caused real black/rainbow frames)
- **Clamp every additive term.** Keep total added radiance under ~0.35 and the
  summed result <= 1.0. Values above 1.0 pass the ACES shoulder and tone-map into
  saturated magenta/cyan/gold banding, which bloom and CA then amplify.
- **No `transmission`** on MeshPhysicalMaterial when an EffectComposer is in use.
- Guard `normalize()` against zero-length vectors and `pow()` against negative
  bases (`max(x, 1e-4)`).
- Never name a GLSL variable `flat`, `sample`, `input`, `output` — reserved words.
- If you declare a `varying` in an injected fragment shader, declare AND assign it
  in the vertex shader too, or the program fails to link.

## Performance
Target 60fps at 1440x900. Instancing / merged geometry / points. Under ~30 draw
calls per module. Reuse materials.

## Verify before you finish
```bash
node --check src/<your-file>.js     # syntax
npm run build                       # must resolve and bundle
```
Write ONLY your assigned file, then report what you did in three lines.
