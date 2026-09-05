import { createVisualSceneAPI } from './visual-scene-api.js';
import { createConcentricFieldScene } from './visual-scenes/concentric-field.js';
import { StellarSynthScene as CosmosScene } from './visual-scenes/audio-reactive-cosmos.js';
import { StellarEngine as NebulaEngine } from './visual-scenes/resonant-nebula.js';
import { ParticleEngine } from './visual-scenes/invisible-universe.js';
import { VisualEngine as AuroraEngine } from './visual-scenes/aurora-core.js';
import { StellarScene as MeridianScene } from './visual-scenes/silver-meridian.js';
import { createStellarEngine as createVeilEngine } from './visual-scenes/thread-veil.js';
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
    setParams(next = {}) { call(['setParams', 'setSettings'], next); },
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

// Presentation tuning is deliberately kept at the host boundary. The authored
// Eazo scenes remain untouched; these values only establish a readable depth
// hierarchy behind the foreground star map and reduce the handful of scenes
// whose additive core/particle pass is naturally very bright.
const SCENE_PROFILES = Object.freeze({
  // Atlas view is visible but deliberately held behind the foreground map.
  // Focus/playing returns the authored scene to essentially its native light.
  'constellation-cipher': { atlas: .74, focus: .98, atlasFilter: 'brightness(.84) saturate(.72) contrast(1.04)', focusFilter: 'brightness(1) saturate(.86) contrast(1.02)', params: { accentColor: '#4d5157', secondaryColor: '#8a8e94', audioSensitivity: .90, lineCount: 44 } },
  'invisible-universe': { atlas: .88, focus: 1, atlasFilter: 'brightness(1.05) contrast(1.04)', focusFilter: 'brightness(1) contrast(1.02)', params: { glow: .62, density: .62, sensitivity: .92, links: .18 }, atlasParams: { glow: .72, density: .68, sensitivity: 1.05 } },
  'audio-reactive-cosmos': { atlas: .72, focus: .96, atlasFilter: 'brightness(.82) saturate(.82) contrast(1.05)', focusFilter: 'brightness(.98) saturate(.94) contrast(1.02)', params: { brightness: .68, bloomStrength: .38, audioReactivity: .92 } },
  'constellation-pulse-a': { atlas: .90, focus: 1, atlasFilter: 'brightness(1.05) saturate(.88) contrast(1.02)', focusFilter: 'brightness(1) saturate(.92) contrast(1.01)', params: { colorCoral: '#8b7770', colorBone: '#858585', colorBoneSoft: '#a3a3a3' } },
  'constellation-pulse-b': { atlas: .90, focus: 1, atlasFilter: 'brightness(1.05) saturate(.84) contrast(1.03)', focusFilter: 'brightness(1) saturate(.90) contrast(1.01)', params: { colorCoral: '#777b81', colorBone: '#858a90', colorBoneSoft: '#aeb2b6' } },
  'aurora-core': { atlas: .68, focus: .94, atlasFilter: 'brightness(.78) saturate(.76) contrast(1.07)', focusFilter: 'brightness(.96) saturate(.88) contrast(1.02)' },
  'resonant-nebula': { atlas: .88, focus: .96, atlasFilter: 'brightness(1.06) saturate(.86) contrast(1.03)', focusFilter: 'brightness(.98) saturate(.92) contrast(1.01)', params: { bloom: .5, sensitivity: .68 }, atlasParams: { bloom: .68, sensitivity: .82 } },
  'orbital-cartography': { atlas: .90, focus: 1, atlasFilter: 'brightness(1.08) saturate(.88) contrast(1.02)', focusFilter: 'brightness(1) saturate(.92) contrast(1.01)', params: { glow: .70, particleCount: 30000 }, atlasParams: { glow: .84 } },
  'stellar-vortex-core': { atlas: .90, focus: 1, atlasFilter: 'brightness(1.08) saturate(.88) contrast(1.03)', focusFilter: 'brightness(1) saturate(.92) contrast(1.01)', params: { particleCount: 30000, glow: 1 }, atlasParams: { glow: 1.12 } },
  'thread-veil': { atlas: .94, focus: 1, atlasFilter: 'brightness(1.16) saturate(.92) contrast(1.02)', focusFilter: 'brightness(1) saturate(.94) contrast(1.01)', params: { density: 1, glow: 1, veilOpacity: 1, rotationSpeed: .02 }, atlasParams: { density: 1.12, glow: 1.10, veilOpacity: 1.08, rotationSpeed: .026 } },
  'constellation-weave': { atlas: .88, focus: .96, atlasFilter: 'brightness(1.06) saturate(.84) contrast(1.03)', focusFilter: 'brightness(.98) saturate(.90) contrast(1.02)', params: { particleCount: 56000, audioSensitivity: .88, glowStrength: 1 }, atlasParams: { audioSensitivity: .98, glowStrength: 1.08 } },
  'night-stardust': { atlas: .88, focus: .96, atlasFilter: 'brightness(1.06) saturate(.86) contrast(1.03)', focusFilter: 'brightness(.98) saturate(.92) contrast(1.02)', params: { particleCount: 36000, audioSensitivity: 1, bloom: 1 }, atlasParams: { audioSensitivity: 1.04, bloom: 1.08 } },
  'silver-meridian': { atlas: .90, focus: 1, atlasFilter: 'brightness(1.08) saturate(.88) contrast(1.02)', focusFilter: 'brightness(1) saturate(.92) contrast(1.01)' },
  'audio-reactive-star-chart': { atlas: .90, focus: .96, atlasFilter: 'brightness(1.08) saturate(.90) contrast(1.02)', focusFilter: 'brightness(.98)' },
  'supernova-pulse': { atlas: .94, focus: .96, atlasFilter: 'brightness(1.16) saturate(.94) contrast(1.02)', focusFilter: 'brightness(.98) saturate(.90) contrast(1.02)', params: { particleSize: .05, brightnessGain: .34, beatGain: 1, coreExpandGain: .40 }, atlasParams: { particleSize: .058, brightnessGain: .50, beatGain: 1.15, coreExpandGain: .48 } },
  'concentric-field': { atlas: .94, focus: 1, atlasFilter: 'brightness(1.15) saturate(.90) contrast(1.02)', focusFilter: 'brightness(1) saturate(.94) contrast(1.01)', params: { density: .84, energy: .62, colorMix: .40, interactionGain: 1, rotationSpeed: 1 }, atlasParams: { density: .92, energy: .74, colorMix: .42, interactionGain: 1.22, rotationSpeed: 1.18 } },
});

function suppressCentralMarker(instance) {
  // A few authored scenes expose a default PointsMaterial at (0,0,0). It
  // reads as an accidental white square when placed under the atlas. Keep the
  // scene's rings/particles intact and only hide that marker when present.
  const candidates = [instance?.coreMat, instance?.core?.coreMat, instance?.core?.material];
  candidates.forEach((material) => {
    if (material && typeof material.opacity === 'number') {
      material.transparent = true;
      material.opacity = 0;
    }
  });
}

const factories = {
  'concentric-field': async ({ host }) => { const canvas = makeCanvas(host); const { width, height } = size(); const scene = createConcentricFieldScene({ canvas, width, height, particleCount: 130000, simulateAudio: false, params: SCENE_PROFILES['concentric-field'].params }); scene.start(); return wrap(scene, { canvas, host, audio: frameState() }); },
  'audio-reactive-cosmos': async ({ host }) => { const canvas = makeCanvas(host); const scene = new CosmosScene({ autoStart: true, maxPixelRatio: 1.5, params: SCENE_PROFILES['audio-reactive-cosmos'].params }); scene.mount(canvas); suppressCentralMarker(scene); return wrap(scene, { canvas, host, audio: frameState() }); },
  'resonant-nebula': async ({ host }) => { const canvas = makeCanvas(host); const scene = new NebulaEngine({ canvas, initialScene: 'black-hole' }); await scene.start(); return wrap(scene, { canvas, host, audio: frameState() }); },
  'invisible-universe': async ({ host }) => { const audio = frameState(); const scene = new ParticleEngine(host, () => ({ lo: audio.bass, mid: audio.mid, hi: audio.high })); scene.setSettings(SCENE_PROFILES['invisible-universe'].params); scene.start(); return wrap(scene, { host, audio }); },
  'aurora-core': async ({ host }) => { const canvas = makeCanvas(host); const state = { bpm: 123, beat: 1, bar: 1, step: 1, energy: .2, scene: 0, holdDuration: 0, releaseAmount: 0, patternVariant: 0, isDown: false, mode: 'idle' }; const scene = new AuroraEngine(canvas, state); scene.start(); const wrapped = wrap(scene, { canvas, host, audio: state }); const setAudio = wrapped.setAudioData; wrapped.setAudioData = (next = {}) => { Object.assign(state, next, { energy: clamp(next.energy ?? next.amplitude ?? state.energy), releaseAmount: clamp(next.drone ?? state.releaseAmount), patternVariant: Math.round(clamp(next.mid ?? 0) * 3) }); setAudio(next); }; return wrapped; },
  'silver-meridian': async ({ host }) => { const canvas = makeCanvas(host); const scene = new MeridianScene(); scene.mount(canvas); scene.setAudioSource('external'); return wrap(scene, { canvas, host, audio: frameState() }); },
  'thread-veil': async ({ host }) => { const canvas = makeCanvas(host); const audio = frameState(); const scene = createVeilEngine(canvas, { params: SCENE_PROFILES['thread-veil'].params }); scene.setAudioSource({ read: () => ({ amplitude: audio.amplitude, frequency: 220 + audio.mid * 440, brightness: audio.high, energy: audio.energy, beat: audio.beat }) }); scene.start(); return wrap(scene, { canvas, host, audio }); },
  'constellation-pulse-a': async ({ host }) => { const audio = frameState(); const scene = new PulseScene(host, { ambientDrive: false, ...(SCENE_PROFILES['constellation-pulse-a'].params || {}) }); scene.start(); suppressCentralMarker(scene); return wrap(scene, { host, audio }); },
  'constellation-pulse-b': async ({ host }) => { const audio = frameState(); const scene = new PulseSceneB(host, { ambientDrive: false, ...(SCENE_PROFILES['constellation-pulse-b'].params || {}) }); scene.start(); suppressCentralMarker(scene); return wrap(scene, { host, audio }); },
  'constellation-cipher': async ({ host }) => { const canvas = makeCanvas(host); const scene = new CipherEngine(SCENE_PROFILES['constellation-cipher'].params); scene.mount(canvas); return wrap(scene, { canvas, host, audio: frameState() }); },
  'constellation-weave': async ({ host }) => { const scene = new WeaveEngine({ useSimulator: false, params: SCENE_PROFILES['constellation-weave'].params }); scene.mount(host); return wrap(scene, { host, audio: frameState() }); },
  'night-stardust': async ({ host }) => { const scene = new StardustEngine({ useSimulator: false, params: SCENE_PROFILES['night-stardust'].params }); scene.mount(host); return wrap(scene, { host, audio: frameState() }); },
  'stellar-vortex-core': async ({ host }) => { const canvas = makeCanvas(host); const scene = new VortexEngine({ useMockAudio: false, params: SCENE_PROFILES['stellar-vortex-core'].params }); scene.init(canvas); scene.start(); return wrap(scene, { canvas, host, audio: frameState() }); },
  'audio-reactive-star-chart': async ({ host }) => wrap(new ChartScene(host), { host, audio: frameState(), starMode: 'data' }),
  'supernova-pulse': async ({ host }) => { const scene = new SupernovaScene(host); scene.engine?.setParams?.(SCENE_PROFILES['supernova-pulse'].params || {}); return wrap(scene, { host, audio: frameState(), destroy: 'dispose', starMode: 'data' }); },
  'orbital-cartography': async ({ host }) => { const scene = new OrbitalScene({ simulateAudio: false, params: SCENE_PROFILES['orbital-cartography'].params }); scene.mount(host); return wrap(scene, { host, audio: frameState(), destroy: 'destroy' }); },
};

const CULTURE_SCENES = Object.freeze({ chinese: 'concentric-field', indian: 'resonant-nebula', western: 'audio-reactive-star-chart', egyptian: 'constellation-pulse-a', hawaiian_starlines: 'orbital-cartography', maori: 'stellar-vortex-core', tongan: 'thread-veil', inuit: 'aurora-core', northern_andes: 'constellation-cipher', tukano: 'audio-reactive-cosmos', navajo: 'constellation-weave', blackfoot: 'supernova-pulse', boorong: 'night-stardust', aztec: 'constellation-pulse-b', tupi: 'invisible-universe' });
export class VisualSceneHost {
  constructor(host) { this.host = host; this.api = createVisualSceneAPI({ factories }); this.sceneId = ''; this.lastFrame = frameState(); this.presentationMode = 'atlas'; }
  async setCulture(cultureId) { const sceneId = CULTURE_SCENES[cultureId]; if (!sceneId) throw new Error(`No visual mapping for culture: ${cultureId}`); this.api.setCulture(cultureId); if (sceneId !== this.sceneId) { const loaded = await this.api.loadScene(sceneId, { host: this.host }); if (!loaded) return; this.sceneId = sceneId; this.host.dataset.visualScene = sceneId; this.host.dataset.visualCanvasCount = String(this.host.querySelectorAll?.('canvas').length || 0); this.api.setCulture(cultureId); this.api.setParams(SCENE_PROFILES[sceneId]?.params || {}); this.api.setAudioData(this.lastFrame); } this.setPresentationMode(this.presentationMode); }
  setAudioData(frame) { this.lastFrame = { ...this.lastFrame, ...frame }; this.api.setAudioData(this.lastFrame); }
  triggerEvent(event) { this.api.triggerEvent(event); }
  triggerStar(star) { this.api.triggerStar(star); }
  resize() { this.api.instance?.resize?.(); }
  dispose() { return this.api.dispose(); }
  setPresentationMode(mode = 'atlas') {
    this.presentationMode = ['atlas', 'focus', 'playing'].includes(mode) ? mode : 'atlas';
    const profile = SCENE_PROFILES[this.sceneId] || { atlas: .72, focus: .96, atlasFilter: 'brightness(.84)', focusFilter: 'brightness(.98)' };
    const opacity = this.presentationMode === 'atlas' ? profile.atlas : profile.focus;
    this.host.style.setProperty('--visual-opacity', String(opacity));
    const filter = this.presentationMode === 'atlas' ? profile.atlasFilter : profile.focusFilter;
    this.host.style.setProperty('--visual-filter', filter || 'none');
    this.api.setParams({ ...(profile.params || {}), ...(this.presentationMode === 'atlas' ? profile.atlasParams || {} : {}) });
    this.host.dataset.visualPresentation = this.presentationMode;
  }
  get activeScene() { return this.api.scene; }
}
export { CULTURE_SCENES, SCENE_PROFILES };
