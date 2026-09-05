import { createVisualSceneAPI } from './visual-scene-api.js';
import { createConcentricFieldScene } from './visual-scenes/concentric-field.js';
import { StellarSynthScene as CosmosScene } from './visual-scenes/audio-reactive-cosmos.js';
import { StellarEngine as NebulaEngine } from './visual-scenes/resonant-nebula.js';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));
const size = () => ({ width: Math.max(1, window.innerWidth), height: Math.max(1, window.innerHeight) });

function starPoint(star = {}) {
  if (star.normalized) return star.normalized;
  if (Number.isFinite(star.x) && Number.isFinite(star.y) && Math.abs(star.x) <= 1.1 && Math.abs(star.y) <= 1.1) return { x: star.x, y: star.y };
  const { width, height } = size();
  const x = Number.isFinite(star.screen?.x) ? star.screen.x : Number(star.x ?? width / 2);
  const y = Number.isFinite(star.screen?.y) ? star.screen.y : Number(star.y ?? height / 2);
  return { x: (x / Math.max(1, star.screen?.width || width)) * 2 - 1, y: -((y / Math.max(1, star.screen?.height || height)) * 2 - 1) };
}

function wrapScene(instance, { canvas, start = true } = {}) {
  const wrapper = {
    setAudioData(frame) {
      const normalized = { ...frame, beat: typeof frame.beat === 'boolean' ? (frame.beat ? 1 : 0) : clamp(frame.beat) };
      if (typeof instance.setAudioData === 'function') instance.setAudioData(normalized);
      else if (typeof instance.setAudioFrame === 'function') instance.setAudioFrame(normalized);
    },
    setCulture(culture) { instance.setCulture?.(culture); },
    triggerStar(star) {
      if (typeof instance.triggerStar === 'function') instance.triggerStar(star);
      else if (typeof instance.tap === 'function') instance.tap(starPoint(star));
      else if (typeof instance.setPointer === 'function') { const point = starPoint(star); instance.setPointer(point.x, point.y); instance.press(); instance.release(); }
    },
    triggerEvent(event = {}) {
      if (typeof instance.triggerEvent === 'function') return instance.triggerEvent(event);
      const intensity = clamp(event.intensity ?? 0.6);
      if (event.type === 'kick' || event.type === 'hat') {
        if (typeof instance.tap === 'function') instance.tap({ x: 0, y: 0 });
        else if (typeof instance.press === 'function') { instance.press(); instance.release?.(); }
      }
      return intensity;
    },
    resize() { const { width, height } = size(); if (typeof instance.resize === 'function') { try { instance.resize(width, height); } catch { instance.resize(); } } },
    dispose() { instance.dispose?.(); },
  };
  if (start) instance.start?.();
  return wrapper;
}

const factories = {
  'concentric-field': async ({ canvas }) => {
    const { width, height } = size();
    const scene = createConcentricFieldScene({ canvas, width, height, particleCount: 130000, simulateAudio: false });
    return wrapScene(scene, { canvas });
  },
  'audio-reactive-cosmos': async ({ canvas }) => {
    const scene = new CosmosScene({ autoStart: true, maxPixelRatio: 1.5 });
    scene.mount(canvas);
    return wrapScene(scene, { canvas, start: false });
  },
  'resonant-nebula': async ({ canvas }) => {
    const scene = new NebulaEngine({ canvas, initialScene: 'black-hole' });
    await scene.start();
    return wrapScene(scene, { canvas, start: false });
  },
};

const CULTURE_SCENES = {
  chinese: 'concentric-field',
  indian: 'resonant-nebula',
  western: 'audio-reactive-cosmos',
};

export class VisualSceneHost {
  constructor(canvas) {
    this.canvas = canvas;
    this.api = createVisualSceneAPI({ factories });
    this.sceneId = '';
    this.lastFrame = {};
  }

  async setCulture(cultureId) {
    const sceneId = CULTURE_SCENES[cultureId] || 'audio-reactive-cosmos';
    this.api.setCulture(cultureId);
    if (sceneId !== this.sceneId) {
      this.sceneId = sceneId;
      await this.api.loadScene(sceneId, { canvas: this.canvas });
      this.api.setCulture(cultureId);
      this.api.setAudioData(this.lastFrame);
    }
  }
  setAudioData(frame) { this.lastFrame = { ...this.lastFrame, ...frame }; this.api.setAudioData(this.lastFrame); }
  triggerEvent(event) { this.api.triggerEvent(event); }
  triggerStar(star) { this.api.triggerStar(star); }
  resize() { this.api.instance?.resize?.(); }
  dispose() { return this.api.dispose(); }
  get activeScene() { return this.api.scene; }
}

export { CULTURE_SCENES };
