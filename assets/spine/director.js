import { state, chapterProgress, chapterWindow, lerp, smoothstep, damp } from './state.js';

// Each chapter lives at its own world stage so modules never collide.
// EDIT THESE TWO TABLES to re-choreograph the whole site: STAGES places each
// module's root in world space, SHOTS defines the camera move within a chapter.
export const STAGES = {
  terrain: [0, 0, 0],
  igloo:   [0, 0, 0],
  cube:    [0, 400, 0],
  tunnel:  [0, 800, 0],
  rings:   [0, 1200, 0],
  figure:  [0, 1200, 0],
};

const V = (x, y, z) => ({ x, y, z });

// pos/target keyframes, expressed relative to the chapter's stage origin.
const SHOTS = {
  hero:   { stage: 'igloo',  from: { p: V(3.0, 4.2, 19.0), t: V(0, 2.2, 0) },
                             to:   { p: V(-1.2, 2.6, 10.0), t: V(0, 1.7, 0) } },
  cube:   { stage: 'cube',   from: { p: V(0.9, 0.9, 7.4),  t: V(0, 0, 0) },
                             to:   { p: V(-0.8, -0.5, 5.0), t: V(0, 0, 0) } },
  tunnel: { stage: 'tunnel', from: { p: V(0, 0, 9.0),      t: V(0, 0, -6) },
                             to:   { p: V(0, 0, -14.0),    t: V(0, 0, -26) } },
  rings:  { stage: 'rings',  from: { p: V(0, 30.0, 0.02),  t: V(0, 0, 0) },
                             to:   { p: V(0, 15.0, 0.02),  t: V(0, 0.6, 0) } },
  figure: { stage: 'figure', from: { p: V(0, 8.5, 8.0),    t: V(0, 1.6, 0) },
                             to:   { p: V(0, 2.4, 6.2),    t: V(0, 2.0, 0) } },
};

const ORDER = ['hero', 'cube', 'tunnel', 'rings', 'figure'];

export class Director {
  constructor(ctx, modules) {
    this.ctx = ctx;
    this.modules = modules;
    this.flash = 0;
    this._p = new ctx.THREE.Vector3();
    this._t = new ctx.THREE.Vector3();
    this._cur = { p: new ctx.THREE.Vector3(), t: new ctx.THREE.Vector3() };
    this._init = false;
    for (const [k, m] of Object.entries(modules)) {
      const s = STAGES[k];
      if (m?.object3d && s) m.object3d.position.set(s[0], s[1], s[2]);
    }
  }

  activeChapter() {
    const s = state.scroll;
    let best = ORDER[0];
    for (const id of ORDER) if (chapterWindow(id, 0.001, s) > 0) best = id;
    return best;
  }

  update(time, dt) {
    const { camera } = this.ctx;
    const id = this.activeChapter();
    state.chapter = id;

    const shot = SHOTS[id];
    const stage = STAGES[shot.stage];
    const k = smoothstep(chapterProgress(id));

    this._p.set(
      stage[0] + lerp(shot.from.p.x, shot.to.p.x, k),
      stage[1] + lerp(shot.from.p.y, shot.to.p.y, k),
      stage[2] + lerp(shot.from.p.z, shot.to.p.z, k),
    );
    this._t.set(
      stage[0] + lerp(shot.from.t.x, shot.to.t.x, k),
      stage[1] + lerp(shot.from.t.y, shot.to.t.y, k),
      stage[2] + lerp(shot.from.t.z, shot.to.t.z, k),
    );

    // subtle parallax from pointer
    this._p.x += state.pointer.nx * 0.35;
    this._p.y += state.pointer.ny * 0.22;

    if (!this._init) { this._cur.p.copy(this._p); this._cur.t.copy(this._t); this._init = true; }
    // Snap across stage changes, damp within a stage.
    const jumped = this._cur.p.distanceTo(this._p) > 60;
    if (jumped) { this._cur.p.copy(this._p); this._cur.t.copy(this._t); }
    else {
      this._cur.p.lerp(this._p, 1 - Math.exp(-6.5 * dt));
      this._cur.t.lerp(this._t, 1 - Math.exp(-6.5 * dt));
    }
    camera.position.copy(this._cur.p);
    camera.lookAt(this._cur.t);

    // Whiteout flash near chapter seams (masks the stage cut).
    const seams = [0.22, 0.42, 0.56, 0.76];
    let f = 0;
    for (const s of seams) f = Math.max(f, 1 - Math.min(1, Math.abs(state.scroll - s) / 0.016));
    // tunnel chapter is inherently blown-out
    f = Math.max(f, chapterWindow('tunnel', 0.02) * 0.55 * smoothstep(chapterProgress('tunnel')));
    this.flash = damp(this.flash, f, 12, dt);
    state.flash = this.flash;
  }
}
