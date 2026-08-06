import * as THREE from 'three';
import { state } from './core/state.js';
import { VirtualScroll } from './core/scroll.js';
import { Director } from './core/director.js';
import { Post } from './core/post.js';

// 1. Import your chapter modules here. One file per chapter, one owner each.
// import { Terrain } from '../scene/terrain.js';

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x9aa3b2, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;   // tune against measured reference values
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xb9c2ce, 0.005);  // see references/gotchas.md on density

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 900);
const ctx = { THREE, scene, camera, renderer };

// 2. Register modules under the same keys used in director.js STAGES.
const modules = {
  // terrain: new Terrain(ctx),
};
for (const m of Object.values(modules)) if (m.object3d) scene.add(m.object3d);

// CRITICAL ORDERING: size the renderer BEFORE constructing Post. EffectComposer
// and UnrealBloomPass seed their render targets from renderer.getSize() inside
// their constructors; seeding from the default 300x150 canvas renders BLACK.
{
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

const post = new Post(ctx);
const director = new Director(ctx, modules);
const scroller = new VirtualScroll();

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.sizes = { w, h, dpr };
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  post.resize?.(state.sizes);
  for (const m of Object.values(modules)) m.resize?.(state.sizes);
}
window.addEventListener('resize', resize);
resize();
requestAnimationFrame(() => resize());  // second pass: some passes settle only after two sizings

document.getElementById('loader')?.classList.add('done');

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  state.time += dt;
  scroller.update(dt);
  director.update(state.time, dt, state);
  for (const m of Object.values(modules)) m.update?.(state.time, dt, state);
  post.render ? post.render(dt) : renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();

// REQUIRED for the verification harness: scripts/capture.py drives the scroller
// through this handle. Do not remove.
window.__site = { scene, camera, renderer, modules, state, scroller, post };
