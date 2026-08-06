// src/core/post.js
// RenderPass -> UnrealBloomPass -> arctic grade -> OutputPass.
// main.js calls post.render(dt) instead of renderer.render().
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { state } from './state.js';

const GRADE_VERTEX = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const GRADE_FRAGMENT = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform float uTime, uFlash;
  uniform vec2 uResolution;
  varying vec2 vUv;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv - 0.5;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 pc = vec2(p.x * aspect, p.y);
    float r2 = dot(pc, pc);
    float rad = sqrt(r2) + 1e-4;
    vec2 dir = pc / rad;

    // faux DoF: blur ramps toward the frame edges
    float blurAmt = r2 * r2 * 1.9;
    vec3 col = vec3(0.0);
    for (int i = -4; i <= 4; i++) {
      col += texture2D(tDiffuse, uv + dir * blurAmt * 0.0030 * (float(i) / 4.0)).rgb;
    }
    col /= 9.0;

    // chromatic aberration toward the edges
    float ca = 0.0002 + r2 * r2 * 0.0014;
    vec3 caCol = vec3(
      texture2D(tDiffuse, uv + dir * ca).r,
      texture2D(tDiffuse, uv).g,
      texture2D(tDiffuse, uv - dir * ca).b);
    col = mix(col, caCol, 0.4);

    // cool vignette (darken only; no additive haze, that was washing mids out)
    float corner = max(length(vec2(aspect * 0.5, 0.5)), 1e-3);
    float vig = smoothstep(0.45, 1.0, clamp(rad / corner, 0.0, 1.0)) * 0.30;
    col *= 1.0 - vig;
    col = mix(col, col * vec3(0.94, 0.97, 1.04), vig);

    // gentle S-curve around mid grey: keeps blacks milky WITHOUT lifting mids
    col = mix(col, col * col * (3.0 - 2.0 * col), 0.14);
    col = col * 0.985 + 0.008;

    float n = hash12(gl_FragCoord.xy + fract(uTime) * 61.7);
    col += (n - 0.5) * 0.035;

    col = mix(col, vec3(1.0), clamp(uFlash, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export class Post {
  constructor(ctx) {
    const { THREE, scene, camera, renderer } = ctx;
    this.THREE = THREE;
    this.renderer = renderer;

    const size = renderer.getSize(new THREE.Vector2());
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(size.width, size.height);

    this.composer.addPass(new RenderPass(scene, camera));

    // Resolution here is only the seed; setSize() below owns it from now on.
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      0.42,   // strength — only blown-out ice should glow
      0.85,   // radius
      0.80,   // threshold
    );
    this.composer.addPass(this.bloomPass);

    this.gradePass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uFlash: { value: 0 },
        uResolution: { value: new THREE.Vector2(size.width * dpr, size.height * dpr) },
      },
      vertexShader: GRADE_VERTEX,
      fragmentShader: GRADE_FRAGMENT,
    });
    this.composer.addPass(this.gradePass);

    this.composer.addPass(new OutputPass());
  }

  render(dt) {
    const u = this.gradePass.uniforms;
    u.uTime.value = state.time;
    u.uFlash.value = state.flash || 0;
    this.composer.render(dt);
  }

  resize(sizes) {
    const { w, h, dpr } = sizes;
    // composer.setSize() forwards to every pass, including UnrealBloomPass.setSize(),
    // which rebuilds its internal render targets. Never poke bloomPass.resolution
    // directly: that desyncs the uniforms from the actual RTs and renders black.
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.gradePass.uniforms.uResolution.value.set(w * dpr, h * dpr);
  }

  dispose() {
    this.composer.dispose();
    this.bloomPass.dispose();
    this.gradePass.dispose();
  }
}
