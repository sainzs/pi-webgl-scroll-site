// Shared runtime state. Read-only for scene modules.
export const CHAPTERS = [
  { id: 'hero',   start: 0.00, end: 0.22 },
  { id: 'cube',   start: 0.22, end: 0.42 },
  { id: 'tunnel', start: 0.42, end: 0.56 },
  { id: 'rings',  start: 0.56, end: 0.76 },
  { id: 'figure', start: 0.76, end: 1.00 },
];

export const state = {
  scroll: 0,          // eased global scroll 0..1
  rawScroll: 0,       // unsmoothed 0..1
  velocity: 0,
  pointer: { x: 0, y: 0, nx: 0, ny: 0 },
  sizes: { w: 1, h: 1, dpr: 1 },
  time: 0,
  chapter: 'hero',
};

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));

// Local 0..1 progress inside a chapter (unclamped edges available via raw).
export function chapterProgress(id, scroll = state.scroll) {
  const c = CHAPTERS.find((x) => x.id === id);
  if (!c) return 0;
  return clamp((scroll - c.start) / (c.end - c.start));
}
// Signed distance-based visibility window with fade margin.
export function chapterWindow(id, fade = 0.05, scroll = state.scroll) {
  const c = CHAPTERS.find((x) => x.id === id);
  if (!c) return 0;
  const inFade = smoothstep((scroll - (c.start - fade)) / fade);
  const outFade = 1 - smoothstep((scroll - c.end) / fade);
  return clamp(Math.min(inFade, outFade));
}
