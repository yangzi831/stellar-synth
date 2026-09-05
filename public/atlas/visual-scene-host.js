import { createVisualSceneAPI } from './visual-scene-api.js';
import { createConcentricFieldScene } from './visual-scenes/concentric-field.js';
import { StellarSynthScene as CosmosScene } from './visual-scenes/audio-reactive-cosmos.js';
import { StellarEngine as NebulaEngine } from './visual-scenes/resonant-nebula.js';
import { ParticleEngine } from './visual-scenes/invisible-universe.js';
import { VisualEngine as AuroraEngine } from './visual-scenes/aurora-core.js';
import { StellarScene as MeridianScene } from './visual-scenes/silver-meridian.js';
import { StellarEngine as VeilEngine } from './visual-scenes/thread-veil.js';
import { StellarScene as PulseScene } from './visual-scenes/constellation-pulse-a.js';
import { StellarScene as PulseSceneB } from './visual-scenes/constellation-pulse-b.js';
import { StellarEngine as CipherEngine } from './visual-scenes/constellation-cipher.js';
import { StellarSynthEngine as WeaveEngine } from './visual-scenes/constellation-weave.js';
import { StellarSynthEngine as StardustEngine } from './visual-scenes/night-stardust.js';
import { StellarSynthEngine as VortexEngine } from './visual-scenes/stellar-vortex-core.js';
import { AudioReactiveStarChartVisualScene as ChartScene } from './visual-scenes/audio-reactive-star-chart.js';
import { SupernovaPulseVisualScene as SupernovaScene } from './visual-scenes/supernova-pulse.js';
import { StellarSynthScene as OrbitalScene } from './visual-scenes/orbital-cartography.js';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));
const size = () => ({ width: Math.max(1, window.innerWidth), height: Math.max(1, window.innerHeight) });
const frameState = () => ({ amplitude: 0, bass: 0, mid: 0, high: 0, energy: 0, beat: 0, drone: 0 });
function makeCanvas(host) { const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;'; host.appendChild(canvas); return canvas; }
function starPoint(star = {}) { if (star.normalized) return star.normalized; const { width, height } = size(); const x = Number.isFinite(star.screen?.x) ? star.screen.x : Number(star.x ?? width / 2); const y = Number.isFinite(star.screen?.y) ? star.screen.y : Number(star.y ?? height / 2); return { x: (x / Math.max(1, star.screen?.width || width)) * 2 - 1, y: -((y / Math.max(1, star.screen?.height || height)) * 2 - 1) }; }
function wrap(instance, { canvas, host, audio, destroy = 'dispose', starMode = 'point' } = {}) {
  const call = (names, ...args) => { for (const name of names) if (typeof instance?.[name] === 'function') return instance[name](...args); };
  return {
    setAudioData(next = {}) { Object.assign(audio, next); call(['setAudioData', 'setAudioFrame', 'pushAudioFrame', 'pushAudio', 'feedAudio'], { ...audio, sustain: audio.drone }); },
    setCulture(culture) { call(['setCulture'], culture); },
    triggerStar(star = {}) {
      if (starMode === 'data' && call(['triggerStar'], star)) return;
      if (starMode !== 'data' && call(['triggerStar'], Number(star.index ?? 0), Boolean(star.hold))) return;
      const p = starPoint(star);
      if (call(['tap'], p.x, p.y)) return;
      call(['handleInput'], { type: 'tap', nx: p.x, ny: p.y, x: p.x, y: p.y });
    },
    triggerEvent(event = {}) { if (call(['triggerEvent'], event)) return; if (event.type === 'kick' || event.type === 'hat') call(['tap', 'trigger', 'pulse'], 0.5, 0.5, clamp(event.intensity ?? 0.7)); },
    resize() { call(['resize']); },
    dispose() {
      if (typeof instance?.[destroy] === 'function') instance[destroy](); else instance?.dispose?.();
      // A few authored scenes create their own canvas inside the host. The
      // visual host owns this container, so clear those nodes on scene swap.
      host?.querySelectorAll?.('canvas').forEach((node) => node.remove());
    },
  };
}

const factories = {
  'concentric-field': async ({ host }) => { const canvas = makeCanvas(host); const { width, height } = size(); return wrap(createConcentricFieldScene({ canvas, width, height, particleCount: 130000, simulateAudio: false, params: { energy: 0.62, density: 0.9, colorMix: 0.42, rotationSpeed: 1 } }), { canvas, host, audio: frameState() }); },
  'audio-reactive-cosmos': async ({ host }) => { const canvas = makeCanvas(host); const scene = new CosmosScene({ autoStart: true, maxPixelRatio: 1.5 }); scene.mount(canvas); return wrap(scene, { canvas, host, audio: frameState() }); },
  'resonant-nebula': async ({ host }) => { const canvas = makeCanvas(host); const scene = new NebulaEngine({ canvas, initialScene: 'black-hole' }); await scene.start(); return wrap(scene, { canvas, host, audio: frameState() }); },
  'invisible-universe': async ({ host }) => { const audio = frameState(); const scene = new ParticleEngine(host, () => ({ lo: audio.bass, mid: audio.mid, hi: audio.high })); scene.start(); return wrap(scene, { host, audio }); },
  'aurora-core': async ({ host }) => { const canvas = makeCanvas(host); const state = { bpm: 123, beat: 1, bar: 1, step: 1, energy: .2, scene: 0, holdDuration: 0, releaseAmount: 0, patternVariant: 0, isDown: false, mode: 'idle' }; const scene = new AuroraEngine(canvas, state); scene.start(); const wrapped = wrap(scene, { canvas, host, audio: state }); const setAudio = wrapped.setAudioData; wrapped.setAudioData = (next = {}) => { Object.assign(state, next, { energy: clamp(next.energy ?? next.amplitude ?? state.energy), releaseAmount: clamp(next.drone ?? state.releaseAmount), patternVariant: Math.round(clamp(next.mid ?? 0) * 3) }); setAudio(next); }; return wrapped; },
  'silver-meridian': async ({ host }) => { const canvas = makeCanvas(host); const scene = new MeridianScene(); scene.mount(canvas); scene.setAudioSource('external'); return wrap(scene, { canvas, host, audio: frameState() }); },
  'thread-veil': async ({ host }) => { const canvas = makeCanvas(host); const audio = frameState(); const scene = new VeilEngine(canvas); scene.setAudioSource({ read: () => ({ amplitude: audio.amplitude, frequency: 220 + audio.mid * 440, brightness: audio.high, energy: audio.energy, beat: audio.beat }) }); scene.start(); return wrap(scene, { canvas, host, audio }); },
  'constellation-pulse-a': async ({ host }) => { const audio = frameState(); const scene = new PulseScene(host, { ambientDrive: false }); scene.start(); return wrap(scene, { host, audio }); },
  'constellation-pulse-b': async ({ host }) => { const audio = frameState(); const scene = new PulseSceneB(host, { ambientDrive: false }); scene.start(); return wrap(scene, { host, audio }); },
  'constellation-cipher': async ({ host }) => { const canvas = makeCanvas(host); const scene = new CipherEngine(); scene.mount(canvas); return wrap(scene, { canvas, host, audio: frameState() }); },
  'constellation-weave': async ({ host }) => { const scene = new WeaveEngine({ useSimulator: false }); scene.mount(host); return wrap(scene, { host, audio: frameState() }); },
  'night-stardust': async ({ host }) => { const scene = new StardustEngine({ useSimulator: false }); scene.mount(host); return wrap(scene, { host, audio: frameState() }); },
  'stellar-vortex-core': async ({ host }) => { const canvas = makeCanvas(host); const scene = new VortexEngine({ useMockAudio: false }); scene.init(canvas); scene.start(); return wrap(scene, { canvas, host, audio: frameState() }); },
  'audio-reactive-star-chart': async ({ host }) => wrap(new ChartScene(host), { host, audio: frameState(), starMode: 'data' }),
  'supernova-pulse': async ({ host }) => wrap(new SupernovaScene({ container: host, params: { syntheticBeat: false } }), { host, audio: frameState(), destroy: 'dispose', starMode: 'data' }),
  'orbital-cartography': async ({ host }) => { const scene = new OrbitalScene({ simulateAudio: false }); scene.mount(host); return wrap(scene, { host, audio: frameState(), destroy: 'destroy' }); },
};

const CULTURE_SCENES = Object.freeze({ chinese: 'concentric-field', indian: 'resonant-nebula', western: 'audio-reactive-star-chart', egyptian: 'constellation-pulse-a', hawaiian_starlines: 'orbital-cartography', maori: 'stellar-vortex-core', tongan: 'thread-veil', inuit: 'aurora-core', northern_andes: 'constellation-cipher', tukano: 'audio-reactive-cosmos', navajo: 'constellation-weave', blackfoot: 'supernova-pulse', boorong: 'night-stardust', aztec: 'constellation-pulse-b', tupi: 'invisible-universe' });
export class VisualSceneHost {
  constructor(host) { this.host = host; this.api = createVisualSceneAPI({ factories }); this.sceneId = ''; this.lastFrame = frameState(); }
  async setCulture(cultureId) { const sceneId = CULTURE_SCENES[cultureId]; if (!sceneId) throw new Error(`No visual mapping for culture: ${cultureId}`); this.api.setCulture(cultureId); if (sceneId !== this.sceneId) { await this.api.loadScene(sceneId, { host: this.host }); this.sceneId = sceneId; this.host.dataset.visualScene = sceneId; this.api.setCulture(cultureId); this.api.setAudioData(this.lastFrame); } }
  setAudioData(frame) { this.lastFrame = { ...this.lastFrame, ...frame }; this.api.setAudioData(this.lastFrame); }
  triggerEvent(event) { this.api.triggerEvent(event); }
  triggerStar(star) { this.api.triggerStar(star); }
  resize() { this.api.instance?.resize?.(); }
  dispose() { return this.api.dispose(); }
  get activeScene() { return this.api.scene; }
}
export { CULTURE_SCENES };
