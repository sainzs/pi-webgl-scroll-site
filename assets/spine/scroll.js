import { state, clamp, damp } from './state.js';

// Virtual scroll: page never actually scrolls (body is fixed/overflow hidden).
export class VirtualScroll {
  constructor({ length = 9000 } = {}) {
    this.length = length;
    this.target = 0;
    this.current = 0;
    this._bind();
  }
  _bind() {
    window.addEventListener('wheel', (e) => {
      this.target = clamp(this.target + e.deltaY / this.length, 0, 1);
    }, { passive: true });

    let touchY = 0;
    window.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      const y = e.touches[0].clientY;
      this.target = clamp(this.target + (touchY - y) * 2.2 / this.length, 0, 1);
      touchY = y;
    }, { passive: true });

    window.addEventListener('keydown', (e) => {
      const step = { ArrowDown: 1, ArrowUp: -1, PageDown: 4, PageUp: -4, ' ': 4 }[e.key];
      if (step) this.target = clamp(this.target + step * 220 / this.length, 0, 1);
    });

    window.addEventListener('pointermove', (e) => {
      state.pointer.x = e.clientX; state.pointer.y = e.clientY;
      state.pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
      state.pointer.ny = -((e.clientY / window.innerHeight) * 2 - 1);
    });
  }
  update(dt) {
    const prev = this.current;
    this.current = damp(this.current, this.target, 4.2, dt);
    state.rawScroll = this.target;
    state.scroll = this.current;
    state.velocity = (this.current - prev) / Math.max(dt, 1e-4);
  }
}
