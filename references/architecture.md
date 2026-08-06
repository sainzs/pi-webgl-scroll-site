# Architecture

The structural pattern that makes a multi-chapter WebGL scroll site tractable: a
small integration spine owned by one author, plus N independent chapter modules
behind a fixed interface. Read this before writing any 3D code — the spine decides
whether the rest of the build is parallelisable or a tangle.

## The spine vs. the chapters

```
src/core/state.js       chapters, shared state, easing helpers   (~40 lines)
src/core/scroll.js      virtual scroll input                     (~42 lines)
src/core/director.js    world stages + camera choreography       (~97 lines)
src/core/post.js        post-processing chain                    (~132 lines)
src/scene/*.js          one module per chapter                   (300-600 each)
src/ui/hud.js           DOM overlay
```

All coupling lives in ~300 lines of core. Chapter modules know only the interface
and the helpers. This is what allows many authors (or subagents) to write
simultaneously without conflicts: **no two modules ever touch the same file, and no
module touches core.**

Own the spine yourself. Delegate the chapters.

## Virtual scroll

The page never scrolls. `html, body { overflow: hidden; touch-action: none }` and a
fixed canvas. Wheel, touch, and key input accumulate into a target in `0..1`, which
is exponentially damped toward each frame.

```js
update(dt) {
  const prev = this.current;
  this.current = damp(this.current, this.target, 4.2, dt);
  state.rawScroll = this.target;      // unsmoothed: for input-responsive UI
  state.scroll    = this.current;     // eased: for all scene animation
  state.velocity  = (this.current - prev) / Math.max(dt, 1e-4);
}
```

Keep **both** values. Scene animation must use the eased value or motion judders.
UI readouts and velocity-driven effects (motion streaks, stretch) want the raw
value and the derived velocity. `damp()` must be frame-rate independent:
`lerp(a, b, 1 - exp(-lambda * dt))`.

## Chapters as ranges

Chapters are `[start, end]` windows over the same `0..1`:

```js
export const CHAPTERS = [
  { id: 'hero',   start: 0.00, end: 0.22 },
  { id: 'cube',   start: 0.22, end: 0.42 },
  { id: 'tunnel', start: 0.42, end: 0.56 },
  { id: 'rings',  start: 0.56, end: 0.76 },
  { id: 'figure', start: 0.76, end: 1.00 },
];
```

Two helpers drive everything downstream:

| Helper | Returns | Use for |
|---|---|---|
| `chapterProgress(id)` | 0..1 across the chapter | animation, camera easing, formation |
| `chapterWindow(id, fade)` | 0..1 envelope with fade margins | visibility and opacity |

**Gate `.visible`, do not merely fade opacity.** A 400x400 displaced terrain plane
still costs a draw call and shadow work when fully transparent. Every module should
open with:

```js
const w = chapterWindow('hero', 0.05, state.scroll);
this.object3d.visible = w > 0.001;
if (!this.object3d.visible) return;
```

## World stages — the key trick

Each chapter's geometry is built around its **own local origin**, and the Director
places the module's root at a far-apart world offset:

```js
export const STAGES = {
  terrain: [0, 0, 0],    igloo:  [0, 0, 0],
  cube:    [0, 400, 0],
  tunnel:  [0, 800, 0],
  rings:   [0, 1200, 0], figure: [0, 1200, 0],
};
```

Why this matters:

- Modules never collide, z-fight, or shadow one another.
- Lights added by one module cannot leak into another chapter.
- Every module author works in a clean coordinate space with ground at `y = 0`.
- Two modules that must share a space (a floor and the figure standing on it) simply
  share a stage.

Consequences to handle:
- Fog is camera-relative, so it keeps working across stages unchanged.
- Lights that must apply everywhere belong to the **spine** (`main.js`/director),
  never inside a module file — even if parented to `scene`. A module that creates
  the scene-wide key/fill takes the rig with it when the module is replaced:
  measured a chapter's mean luminance drop 188 -> 100, zero console errors.
  Chapter-local lights go on the module's own group so `.visible` gates them.
- The camera jump between stages is instantaneous and must be masked (below).

## The Director

Per-chapter camera keyframes, expressed **relative to the stage origin**:

```js
const SHOTS = {
  hero: { stage: 'igloo',
          from: { p: V(3.0, 4.2, 19.0), t: V(0, 2.2, 0) },
          to:   { p: V(-1.2, 2.6, 10.0), t: V(0, 1.7, 0) } },
  // ...
};
```

Each frame the Director:

1. Finds the active chapter from `state.scroll`.
2. Lerps `from -> to` by `smoothstep(chapterProgress(id))`.
3. Adds the stage offset and a small pointer parallax.
4. Damps toward the result **within** a stage, but **snaps** across a stage jump:

```js
const jumped = this._cur.p.distanceTo(this._p) > 60;
if (jumped) { this._cur.p.copy(this._p); this._cur.t.copy(this._t); }
else {
  this._cur.p.lerp(this._p, 1 - Math.exp(-6.5 * dt));
  this._cur.t.lerp(this._t, 1 - Math.exp(-6.5 * dt));
}
camera.position.copy(this._cur.p);
camera.lookAt(this._cur.t);
```

Without the snap the camera would fly 400 units between stages over several
seconds, showing empty space.

## Seam masking

The stage cut is instantaneous, so hide it. The Director computes a `flash` value
that peaks at chapter boundaries and decays:

```js
const seams = [0.22, 0.42, 0.56, 0.76];
let f = 0;
for (const s of seams) f = Math.max(f, 1 - Math.min(1, Math.abs(state.scroll - s) / 0.016));
this.flash = damp(this.flash, f, 12, dt);
state.flash = this.flash;
```

The post chain reads `state.flash` and mixes the frame toward white. Tune the
divisor: too wide and the site shows blank frames; ~0.016 reads as a transition.
A chapter that is inherently blown out (a whiteout tunnel) can raise the floor.

One QA consequence: a screenshot rung placed exactly on a seam scores blank in a
healthy build, because the flash is *supposed* to white the frame. Offset capture
rungs a few thousandths past each seam (0.76 -> 0.785 measured).

## Module interface

```js
export class X {
  constructor(ctx) {}            // ctx = { THREE, scene, camera, renderer }
  get object3d() {}              // THREE.Object3D root
  update(time, dt, state) {}
  resize(sizes) {}               // optional
  dispose() {}                   // optional
}
```

Rules, enforced by the contract:
- Build around local origin, ground at `y = 0`.
- Never set your own world position (the Director owns it); never touch the camera.
- Only mutate objects you created.
- Gate `.visible` on your chapter window.

`main.js` constructs modules, adds `object3d` to the scene, and calls `update` on
each every frame. It also exposes `window.__site` for the verification harness.

## Re-choreographing the site

Two tables control the entire experience:

| Edit | Effect |
|---|---|
| `CHAPTERS` in `state.js` | how much scroll each chapter occupies |
| `STAGES` in `director.js` | where each module's geometry lives |
| `SHOTS` in `director.js` | the camera move within each chapter |

Do **not** change the module interface, the damping/snap logic, or the flash seam
mechanism to achieve a look — those are load-bearing. Change the tables.
