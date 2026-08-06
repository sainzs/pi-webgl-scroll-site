# Failure Catalogue

Measured failures from building a production three.js scroll site. Each entry gives
the symptom you will actually observe, the cause, the fix, and the diagnostic that
proves it. Read this the moment a frame renders black, blown out, or saturated —
these are not hypothetical, every one cost real debugging time.

---

## 1. `transmission` + EffectComposer = entirely black frame

**Symptom.** The whole canvas is black in the chapter containing a glass/ice
material. Other chapters are fine. No console error. Bypassing post-processing
renders the scene correctly.

**Cause.** `MeshPhysicalMaterial.transmission > 0` makes three render a separate
transmission backdrop pass into an internal render target. That pass does not
survive an `EffectComposer` chain.

**Fix.** Remove transmission entirely and rebuild the substance:

```js
// BAD with a composer
new THREE.MeshPhysicalMaterial({ transmission: 0.65, thickness: 1.6, ior: 1.31 })

// GOOD: envMap + clearcoat + fresnel rim + faint subsurface emissive
new THREE.MeshPhysicalMaterial({
  color: 0xbfcce2, roughness: 0.40, clearcoat: 0.9, clearcoatRoughness: 0.25,
  envMap: myProceduralEnv, envMapIntensity: 0.85,
  emissive: new THREE.Color(0x46566e), emissiveIntensity: 0.30,
})
```
Add a fresnel rim via `onBeforeCompile` for the thick-glass read.

**Confirm it.** At runtime, force transmission off and watch the frame return:
```js
modules.cube.object3d.traverse(c => {
  if (c.material?.transmission !== undefined) {
    c.material.transmission = 0; c.material.needsUpdate = true;
  }
});
```

---

## 2. Mutating `UnrealBloomPass.resolution` = black frame

**Symptom.** Black frame from the first render, or after any window resize.

**Cause.** Setting `bloomPass.resolution.set(w, h)` updates the uniform but does
not rebuild the pass's internal render targets. The uniforms and the targets
desync and the pass outputs nothing.

**Fix.** Never touch `resolution`. `composer.setSize()` forwards to every pass and
`UnrealBloomPass.setSize()` rebuilds its targets correctly.

```js
resize({ w, h, dpr }) {
  this.composer.setPixelRatio(dpr);
  this.composer.setSize(w, h);        // this is the whole fix
  this.gradePass.uniforms.uResolution.value.set(w * dpr, h * dpr);
}
```

**Confirm it.** Disable passes one at a time and screenshot each configuration:
```js
composer.passes[1].enabled = false;   // bloom off -> frame returns?
```

---

## 3. Post constructed before the renderer is sized = black frame

**Symptom.** Black on load; a manual window resize fixes it permanently.

**Cause.** `EffectComposer` and `UnrealBloomPass` seed their render targets from
`renderer.getSize()` **inside their constructors**. If the renderer still has the
default 300x150 canvas, they seed at 300x150.

**Fix.** Size renderer and camera before constructing post, and schedule a second
resize on the next frame:

```js
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight, false);
camera.aspect = innerWidth / innerHeight;
camera.updateProjectionMatrix();

const post = new Post(ctx);          // only now

resize();
requestAnimationFrame(() => resize());
```

**Confirm it.** Programmatically resize the viewport and re-screenshot. If the
frame repairs itself, it is a boot-order bug.

---

## 4. `flat` is a reserved GLSL keyword

**Symptom.** `ERROR: 0:196: 'flat' : syntax error`, vertex shader fails to compile,
`useProgram: program not valid` warnings flood the console.

**Cause.** `flat` is a GLSL interpolation qualifier. `float flat = smoothstep(...)`
is a syntax error.

**Fix.** Rename the variable. Other names to avoid: `sample`, `input`, `output`,
`filter`, `buffer`, `layout`, `smooth`, `noperspective`, `precision`, `invariant`,
`common`, `partition`, `active`, `resource`, `patch`.

---

## 5. Additive terms above 1.0 become rainbow banding

**Symptom.** Saturated magenta, cyan, yellow or gold contour bands across a surface
that is supposed to be neutral. Often concentric or following a gradient.

**Cause.** ACES tone mapping has a shoulder. Values pushed well past 1.0 roll off
per-channel at different rates, so a neutral over-bright value splits into hue.
Bloom then selects those pixels and chromatic aberration fringes them.

**Fix.** Clamp before adding, and keep the sum at or below 1.0.

```glsl
// BAD: up to 3.0 of added radiance
totalEmissiveRadiance += vec3(0.82, 0.9, 1.0) * band * 3.0;

// GOOD
totalEmissiveRadiance += clamp(vec3(0.82, 0.9, 1.0) * band * 0.30, 0.0, 0.35);
```
For a neutral art direction, also desaturate at the end so no hue can survive:
```glsl
col = mix(col, vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), 0.9);
```
Watch for a second offender: an env map whose sun patch has unequal channel gains
(`r + sun, g + sun*0.98, b + sun*0.95`) tints every specular highlight warm and
blows to yellow at high gain. Keep it neutral.

**Confirm it.** Measure per-pixel channel spread — see `scripts/check_frames.py`.
On a desaturated art direction, spread above ~45 means a blown additive term.

---

## 6. Fragment varying with no vertex varying fails to link

**Symptom.** `Program Info Log: FRAGMENT varying vObjPos does not match any VERTEX
varying`, followed by `useProgram: program not valid`.

**Cause.** Injecting only the fragment half of a shader patch via
`onBeforeCompile`, while the varying is never declared or assigned in the vertex
shader.

**Fix.** Patch both halves together:

```js
shader.vertexShader = shader.vertexShader
  .replace('#include <common>', 'varying vec3 vObjPos;\n#include <common>')
  .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvObjPos = position;');
```

---

## 7. `FogExp2` silently erases distant geometry

**Symptom.** Mountains, skylines, or any far-field geometry are simply absent. The
geometry exists and is in front of the camera; the horizon is empty haze.

**Cause.** Exponential-squared fog saturates fast. Opacity is `1 - exp(-(d*density)^2)`.

| density | 50u | 100u | 160u | 300u |
|---|---|---|---|---|
| 0.0125 | 32% | 79% | 98% | ~100% |
| 0.0080 | 15% | 47% | 82% | ~100% |
| 0.0050 | 6% | 22% | 47% | 90% |
| 0.0030 | 2% | 9% | 20% | 56% |

**Fix.** Choose density from the scene scale: pick the distance at which things
should be ~50% hazed and solve. For far-field terrain at 100-160 units, use
~0.005 and add your own height-based haze in the terrain shader for mood.

**Confirm it.** Temporarily set `scene.fog = null` and re-screenshot. If the
geometry appears, it was fog, not your geometry.

---

## 8. `ShaderMaterial` with `fog: true` and no fog uniforms

**Symptom.** `TypeError: Cannot read properties of undefined (reading 'value')`
originating in `refreshFogUniforms`, thrown every frame.

**Cause.** Shaders that include the `<fog_*>` chunks and set `fog: true` must also
carry three's fog uniform block. Custom uniform objects do not have it.

**Fix.**
```js
Object.assign(uniforms, THREE.UniformsUtils.clone(THREE.UniformsLib.fog));
```

---

## 9. Scene-wide lights owned by a chapter module

**Symptom.** After replacing or rewriting one chapter module, *other* chapters go
dim. Zero console errors. Measured: a chapter's mean luminance dropped 188 -> 100
when an unrelated module was swapped out.

**Cause.** The old module had added the scene's key and fill lights to `scene`
itself. Replacing the module deleted the whole site's lighting rig with it.

**Fix.** Ownership rule: lights a chapter needs live on that module's own group
(so they die with it, and are gated by its `.visible`). The scene-wide rig —
key, fill, ambient — belongs to the spine (`main.js`/director), never a module.

**Confirm it.** Dump `scene.children` for lights and check which file created
each. Any `Light` parented to `scene` from inside `src/scene/*.js` is the bug.

---

## 10. Linear shader output under EffectComposer = blank white chapter

**Symptom.** One chapter renders as a nearly featureless white field. Measured:
per-frame stddev ~7 across 17% of the scroll range. No errors; palette looked
reasonable in the source.

**Cause.** With `EffectComposer`, materials are **not** tone-mapped inline;
`OutputPass` applies ACES (exposure 0.82) after the chain. Custom shader output
is therefore linear, and ACES+sRGB compresses everything above ~0.45 linear into
sRGB 178-220 — a palette authored at 0.74-0.99 collapses into one white band.

**Fix.** Budget structural colour to 0.07-0.45 **linear** so ACES has contrast to
work with. Haze/fog should blend toward the TRUE linear background colour (the
value you cleared with, not its sRGB appearance), and be capped, not additive to 1.

**Confirm it.** `scripts/check_frames.py` stddev per rung; a healthy chapter sits
well above ~7. Or dump the shader's pre-OutputPass value at two probe points and
check they straddle 0.45.

---

## 11. QA capture rungs landing on a transition seam

**Symptom.** The frame-check harness flags a rung as BLANK/whiteout in a build
that is visually healthy.

**Cause.** A fixed capture scroll value sits exactly on a chapter seam, where the
flash mask legitimately whites the frame out. The QA is measuring the transition
effect, not the chapter.

**Fix.** Offset QA rungs a few thousandths past each seam (measured: 0.76 ->
0.785 cleared it). Keep seam values themselves out of the rung list, or tag them
as expected-white.

---

## 12. Tooling traps

- **Do not name a helper script `bisect.py`.** It shadows the stdlib `bisect` that
  PIL imports, producing `partially initialized module 'PIL.Image' has no attribute
  'open' (most likely due to a circular import)`.
- **`gl.readPixels` on the default framebuffer returns zeros** after compositing
  unless the context was created with `preserveDrawingBuffer: true`. Screenshot and
  inspect with Pillow instead.
- **GPU flags can mask failures.** `--use-angle=metal`,
  `--enable-unsafe-swiftshader` change behaviour. Test at least once with no flags.
- **A child agent may rewrite a file** and silently discard your hand-patch. Re-read
  the file before editing and verify your change survived.

---

## Procedure: a frame is black — bisect it

Run these in order; each step halves the search space. Do not theorise first.

1. **Is the app alive?** `window.__site` defined? Any console/page error? A shader
   link failure often leaves the picture plausible but a material dead.
2. **Bypass post entirely.** `post.render = null` (main falls back to
   `renderer.render`). Frame returns => the bug is in the composer chain.
3. **Disable passes one at a time.** `composer.passes[i].enabled = false`,
   screenshot each. Identifies the offending pass exactly.
4. **Probe the scene graph.** Dump each module's `visible`, world `position`, child
   count, and the camera position. Confirms staging and visibility windows.
5. **Hide the suspect module.** `modules.x.object3d.visible = false`. Frame returns
   => the module is the cause.
6. **Toggle material properties.** Especially `transmission`, `transparent`,
   `blending`, `depthWrite`, `opacity`.
7. **Force a resize.** Repairs => boot-order/sizing bug (entries 2 and 3).
8. Only now read the shader source.

Screenshot at every step and compare pixel values; do not trust recollection.
