/*
 * Derived from D5 v12 Topological Playground and the D5 v13 Sequencer Map
 * patch by Ewan Qian / 钱誉文. Used and modified under the MIT License.
 * The signal path remains synthesis-only: oscillators, procedurally generated
 * sample buffers, filtered noise, stereo panning, gain envelopes and dynamics
 * compression. No third-party recording or sample pack is bundled.
 */

export const BPM = 150;
const BEAT = 60 / BPM;
const EIGHTH = BEAT / 2;
const SIXTEENTH = BEAT / 4;
const GROOVE_STEPS = 16;
const SECTION_A_STEPS = 32;
const ARRANGEMENT_PHASES = [
  { id: 'birth', start: 0, end: 32, label: 'BIRTH', next: 'ORBIT' },
  { id: 'orbit', start: 32, end: 96, label: 'ORBIT', next: 'CONSTELLATION' },
  { id: 'constellation', start: 96, end: 224, label: 'CONSTELLATION', next: 'ECLIPSE' },
  { id: 'eclipse', start: 224, end: 288, label: 'ECLIPSE / VARIATION', next: 'BIRTH' },
];
const LOOK_AHEAD = 0.13;
const MAX_VOICES = 84;
const MAX_INTERACTIONS = 8;
const MASTER_GAIN = 1.4;
const MAKEUP_GAIN = 1.28;
const ARRANGEMENT_GAIN = 0.92;
const MANUAL_GAIN = 1.72;
const BED_GAIN = 0.42;
const HOLD_THRESHOLD_MS = 350;
const TWO_BARS = BEAT * 8;
const MODES = [
  { id: 'aeolian', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'minor-pentatonic', intervals: [0, 3, 5, 7, 10] },
  { id: 'lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },
  { id: 'harmonic-minor', intervals: [0, 2, 3, 5, 7, 8, 11] },
];
const TONICS = [38, 40, 41, 43, 45, 47];
const METERS = [12, 14, 16, 20]; // 3/4, 7/8, 4/4, 5/4 in sixteenth steps.
const PROGRESSIONS = [[0], [0, 5, 3], [0, 3, 5, 4], [0, 4, 5, 3], [0, 2, 6]];

export const SCENES = [
  { number: 1, id: 'intro', label: 'INTRO', bars: 4, tracks: ['harmony', 'texture'], energy: 0.18 },
  { number: 2, id: 'groove-a', label: 'GROOVE A', bars: 8, tracks: ['drums', 'bass', 'texture'], energy: 0.48 },
  { number: 3, id: 'groove-b', label: 'GROOVE B', bars: 8, tracks: ['drums', 'bass', 'texture'], energy: 0.58 },
  { number: 4, id: 'bass-drive', label: 'BASS DRIVE', bars: 8, tracks: ['drums', 'bass', 'synth', 'texture'], energy: 0.7 },
  { number: 5, id: 'synth-build', label: 'SYNTH BUILD', bars: 8, tracks: ['drums', 'bass', 'synth', 'texture'], energy: 0.78 },
  { number: 6, id: 'melodic-open', label: 'MELODIC OPEN', bars: 8, tracks: ['drums', 'bass', 'synth', 'harmony', 'lead', 'texture'], energy: 0.76 },
  { number: 7, id: 'break', label: 'BREAK', bars: 4, tracks: ['harmony', 'lead', 'texture'], energy: 0.28 },
  { number: 8, id: 'peak-return', label: 'PEAK / RETURN', bars: 8, tracks: ['drums', 'bass', 'synth', 'harmony', 'lead', 'texture'], energy: 1 },
  { number: 9, id: 'outro-experiment', label: 'OUTRO / EXPERIMENT', bars: 4, tracks: ['drums', 'synth', 'lead', 'texture'], energy: 0.46 },
];

const SCENE_BY_NUMBER = new Map(SCENES.map((scene) => [scene.number, scene]));
const AUTO_SCENE_ORDERS = {
  chinese: [1, 2, 3, 4, 6, 5, 7, 8, 9],
  western: [1, 2, 4, 3, 5, 6, 7, 8, 9],
  indian: [1, 2, 3, 6, 4, 5, 7, 8, 9],
  northern_andes: [1, 3, 2, 4, 6, 5, 7, 8, 9],
  fallback: [1, 2, 3, 4, 5, 6, 7, 8, 9],
};

export const CULTURE_SAMPLE_MANIFEST = {
  version: 1,
  policy: 'optional-licensed-user-assets-with-synthetic-fallback',
  basePath: '../audio',
  cultures: {
    chinese: {
      guzheng: { path: 'chinese/guzheng/', fallback: 'synthetic-plucked-string' },
      pipa: { path: 'chinese/pipa/', fallback: 'synthetic-short-pluck' },
      dizi: { path: 'chinese/dizi/', fallback: 'synthetic-air-column' },
      metalPercussion: { path: 'chinese/metal-percussion/', fallback: 'synthetic-metal-strike' },
    },
    western: {
      harpsichord: { path: 'western/harpsichord/', fallback: 'synthetic-harpsichord' },
      harp: { path: 'western/harp/', fallback: 'synthetic-harp' },
      piano: { path: 'western/piano/', fallback: 'synthetic-keys' },
      strings: { path: 'western/strings/', fallback: 'synthetic-string-layer' },
    },
    indian: {
      pluckedString: { path: 'indian/plucked-string/', fallback: 'synthetic-plucked-string' },
      drone: { path: 'indian/drone/', fallback: 'synthetic-tonic-drone' },
      percussion: { path: 'indian/percussion/', fallback: 'synthetic-resonant-percussion' },
    },
  },
};

const LOOP_STAGES = [
  { id: 'drums', label: 'DRUM', instrument: 'DRUM · Q KICK / W HI-HAT', bars: 4, grid: 2, gridLabel: 'Q 1/4 · W 1/8', keyHint: 'Q — KICK · W — HI-HAT' },
  { id: 'bass', label: 'BASS', instrument: 'BASS · DEEP SYNTH', bars: 4, grid: 2, gridLabel: '1/8', keyHint: 'E–P STAR BASS · A–L +8VE · Z–M RESPONSE' },
  { id: 'synth', label: 'ARP', instrument: 'ARP · RHYTHMIC PLUCK', bars: 4, grid: 2, gridLabel: '1/8', keyHint: 'E–P PLUCK · A–L HIGH SEQUENCE · Z–M LOW PULSE' },
  { id: 'harmony', label: 'HARMONY', instrument: 'HARMONY · SPACE PAD', bars: 4, grid: 2, gridLabel: '1/8', keyHint: 'E–P OPEN VOICING · A–L +8VE · Z–M LOW VOICING' },
  { id: 'lead', label: 'MELODY', instrument: 'MELODY · STAR MOTIF', bars: 4, grid: 2, gridLabel: '1/8', keyHint: 'E–P MOTIF · A–L HIGH MOTIF · Z–M RESPONSE' },
  { id: 'texture', label: 'TEXTURE', instrument: 'TEXTURE · GRANULAR SPACE', bars: 4, grid: 2, gridLabel: '1/8', keyHint: 'E–P AIR / GRAIN · A–M TEXTURE VARIATIONS' },
];

// Culture profiles describe musical organisation, never ethnic instrument skins.
// The four named profiles are intentionally culture-inspired prototypes; every
// other sky culture keeps the original deterministic landmark grammar.
export const CULTURE_MUSIC_PROFILES = {
  chinese: {
    id: 'chinese', pitchCollection: [0, 2, 4, 7, 9], tonicPolicy: 'landmark',
    meters: [12, 16, 20], progressions: [[0], [0, 3], [0, 4, 3]],
    intervalPreferences: [0, 4, 7, 12, 16], voicing: 'open-pentatonic', voiceCount: 3,
    register: { base: 7, spread: 24 }, groupingPreference: 'sparse-anchor',
    rhythm: { arpStride: [3, 4], syncopation: 0.2, density: 0.56 },
    fragment: { repeats: [2, 3], subdivisionBeats: [0.25, 0.5], restBeats: [0.75, 1.25], articulation: 'metallic' },
    drone: { degree: 0, fifth: true, level: 0.45 }, spatial: 0.72,
    arrangement: { id: 'pentatonic-space', sectionBars: [4, 6, 4, 4, 4, 4, 6, 3], density: 0.66, kickFamily: 'round', bassFamily: 'pedal', synthFamily: 'metallic-motif', harmonyFamily: 'open', textureFamily: 'clean-air', particleMotion: 'radial' },
  },
  western: {
    id: 'western', pitchCollections: MODES.slice(0, 4).map((entry) => entry.intervals), tonicPolicy: 'landmark',
    meters: METERS, progressions: PROGRESSIONS,
    intervalPreferences: [0, 2, 4, 6, 8], voicing: 'modal-vertical', voiceCount: 4,
    register: { base: 0, spread: 24 }, groupingPreference: 'branch-voicing',
    rhythm: { arpStride: [2, 3, 4], syncopation: 0.34, density: 0.72 },
    fragment: { repeats: [2, 4], subdivisionBeats: [0.25, 0.5], restBeats: [0.5, 1], articulation: 'broken-voicing' },
    drone: { degree: 0, fifth: false, level: 0.2 }, spatial: 0.62,
    arrangement: { id: 'modal-drive', sectionBars: [3, 6, 4, 4, 5, 4, 7, 3], density: 0.9, kickFamily: 'punchy', bassFamily: 'root-motion', synthFamily: 'arp-opening', harmonyFamily: 'voice-led', textureFamily: 'stereo-weave', particleMotion: 'linear' },
  },
  indian: {
    id: 'indian', pitchCollection: [0, 2, 3, 5, 7, 9, 10], tonicPolicy: 'culture',
    meters: [14, 16, 20], progressions: [[0], [0, 4]],
    intervalPreferences: [0, 1, 4, 7, 12], voicing: 'tonic-orbit', voiceCount: 3,
    register: { base: 0, spread: 19 }, groupingPreference: 'cyclic-orbit',
    rhythm: { arpStride: [3, 4], syncopation: 0.42, density: 0.62 },
    fragment: { repeats: [2, 3], subdivisionBeats: [0.5, 0.75], restBeats: [0.5, 1.5], articulation: 'ornament-orbit' },
    drone: { degree: 0, fifth: true, level: 0.8 }, spatial: 0.48,
    arrangement: { id: 'drone-cycle', sectionBars: [4, 5, 5, 4, 5, 5, 6, 4], density: 0.74, kickFamily: 'sub', bassFamily: 'tonic-fifth', synthFamily: 'orbit', harmonyFamily: 'drone', textureFamily: 'continuous-grain', particleMotion: 'orbital' },
  },
  northern_andes: {
    id: 'northern-andes', pitchCollection: [0, 2, 4, 7, 9], tonicPolicy: 'landmark',
    meters: [12, 14, 20], progressions: [[0], [0, 4], [0, 3, 4]],
    intervalPreferences: [0, 2, 4, 7, 12], voicing: 'airy-ostinato', voiceCount: 4,
    register: { base: 12, spread: 24 }, groupingPreference: 'call-response',
    rhythm: { arpStride: [2, 3], syncopation: 0.58, density: 0.82 },
    fragment: { repeats: [2, 4], subdivisionBeats: [0.25, 0.5], restBeats: [0.5, 1], articulation: 'airy-pulse' },
    drone: { degree: 0, fifth: false, level: 0.32 }, spatial: 0.82,
  },
};

const FALLBACK_CULTURE_PROFILE = {
  id: 'deterministic-fallback', meters: METERS, progressions: PROGRESSIONS,
  intervalPreferences: [0, 2, 4, 7, 12], voicing: 'stellar-modal', voiceCount: 4,
  register: { base: 0, spread: 24 }, groupingPreference: 'topology',
  rhythm: { arpStride: [2, 3, 4], syncopation: 0.38, density: 0.68 },
  fragment: { repeats: [2, 4], subdivisionBeats: [0.25, 0.5], restBeats: [0.5, 1.25], articulation: 'stellar' },
  drone: { degree: 0, fifth: false, level: 0.25 }, spatial: 0.68,
  arrangement: { id: 'stellar-fallback', sectionBars: [4, 6, 4, 4, 4, 4, 6, 3], density: 0.72, kickFamily: 'balanced', bassFamily: 'stellar', synthFamily: 'path', harmonyFamily: 'modal', textureFamily: 'air', particleMotion: 'stellar' },
};

export const TRACK_IDS = ['drums', 'bass', 'synth', 'harmony', 'lead', 'texture'];
const TRACK_VARIANT_NAMES = {
  drums: ['deep-round', 'short-punch', 'sub-long', 'dry-tight', 'reduced'],
  bass: ['pedal', 'offbeat', 'ostinato', 'response'],
  synth: ['pluck-sequence', 'arp', 'pulse-sequence', 'broken-motif'],
  harmony: ['drone', 'open-pad', 'modal-pad', 'slow-layer'],
  lead: ['motif-a', 'motif-b', 'fragment-lead', 'orbit-lead'],
  texture: ['grain', 'noise-air', 'resonance', 'transition'],
};

const hashText = (value = '') => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const scaleNote = (tonic, degree, mode) => {
  const octave = Math.floor(degree / mode.length);
  const index = ((degree % mode.length) + mode.length) % mode.length;
  return tonic + mode[index] + octave * 12;
};

const midi = (note) => 440 * 2 ** ((note - 69) / 12);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const unitNoise = (seed) => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
};

export class SequencerAudio extends EventTarget {
  constructor() {
    super();
    this.context = null;
    this.master = null;
    this.makeup = null;
    this.compressor = null;
    this.limiter = null;
    this.outputMeter = null;
    this.noiseBuffer = null;
    this.gestureBus = null;
    this.reverbSend = null;
    this.reverb = null;
    this.reverbReturn = null;
    this.arrangementBus = null;
    this.bedBus = null;
    this.delay = null;
    this.delayFeedback = null;
    this.delayReturn = null;
    this.running = false;
    this.timer = null;
    this.nextTick = 0;
    this.tick = 0;
    this.eventTick = 0;
    this.events = [];
    this.arrangementMode = 'path';
    this.arrangementStep = 0;
    this.nextArrangementTick = 0;
    this.sequence = [];
    this.profile = this.createProfile([], {});
    this.trackLanes = new Map();
    this.currentSection = 'intro';
    this.currentScene = 1;
    this.pendingScene = null;
    this.sceneAuto = true;
    this.sceneStartedBar = 0;
    this.sectionBar = 0;
    this.formBar = 0;
    this.timelineOrigin = 0;
    this.patterns = { bass: [], synth: [], lead: [] };
    this.constellationGroove = { starts: [], kick: [], hats: [], open: [], perc: [], bass: [], synth: [], signature: [] };
    this.sectionPhase = 'signature';
    this.arrangementPhase = 'birth';
    this.motif = [];
    this.motifSignature = '';
    this.lastBedStep = -Infinity;
    this.loopSession = null;
    this.trackEnvelopes = Object.fromEntries(TRACK_IDS.map((id) => [id, { time: -99, amount: 0 }]));
    this.lastArrangementState = null;
    this.active = new Set();
    this.interactions = new Map();
    this.interactionTimer = null;
    this.voices = 0;
  }

  async ensure() {
    if (!this.context) {
      const Context = window.AudioContext || window.webkitAudioContext;
      this.context = new Context();
    }
    if (this.context.state === 'suspended') await this.context.resume();
    if (this.master) return;
    const ac = this.context;
    this.master = ac.createGain();
    this.master.gain.value = MASTER_GAIN;
    this.compressor = ac.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 3.5;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.18;
    this.makeup = ac.createGain();
    this.makeup.gain.value = MAKEUP_GAIN;
    this.limiter = ac.createDynamicsCompressor();
    this.limiter.threshold.value = -1;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.09;
    this.outputMeter = ac.createAnalyser();
    this.outputMeter.fftSize = 2048;
    this.outputMeter.smoothingTimeConstant = 0.72;
    this.master.connect(this.compressor).connect(this.makeup).connect(this.limiter).connect(this.outputMeter).connect(ac.destination);
    this.noiseBuffer = this.makeNoise();
    this.gestureBus = ac.createGain();
    this.gestureBus.gain.value = MANUAL_GAIN;
    this.gestureBus.connect(this.master);
    this.reverbSend = ac.createGain();
    this.reverbSend.gain.value = 0.26;
    this.reverb = ac.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.8);
    this.reverbReturn = ac.createGain();
    this.reverbReturn.gain.value = 0.38;
    this.reverbSend.connect(this.reverb).connect(this.reverbReturn).connect(this.master);
    this.arrangementBus = ac.createGain();
    this.arrangementBus.gain.value = ARRANGEMENT_GAIN;
    this.arrangementBus.connect(this.master);
    this.arrangementBus.connect(this.reverbSend);
    this.bedBus = ac.createGain();
    this.bedBus.gain.value = BED_GAIN;
    this.bedBus.connect(this.arrangementBus);
    this.delay = ac.createDelay(1.2);
    this.delay.delayTime.value = BEAT * 0.75;
    this.delayFeedback = ac.createGain();
    this.delayFeedback.gain.value = 0.36;
    this.delayReturn = ac.createGain();
    this.delayReturn.gain.value = 0.29;
    this.delay.connect(this.delayFeedback).connect(this.delay);
    this.delay.connect(this.delayReturn).connect(this.master);
  }

  makeNoise() {
    const buffer = this.context.createBuffer(1, this.context.sampleRate * 3, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i += 1) channel[i] = Math.random() * 2 - 1;
    return buffer;
  }

  makeImpulse(duration) {
    const length = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(2, length, this.context.sampleRate);
    let seed = 0x51f15e;
    for (let channelIndex = 0; channelIndex < 2; channelIndex += 1) {
      const channel = buffer.getChannelData(channelIndex);
      for (let i = 0; i < length; i += 1) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const noise = (seed / 0xffffffff) * 2 - 1;
        channel[i] = noise * ((1 - i / length) ** 2.35) * (channelIndex ? 0.88 : 1);
      }
    }
    return buffer;
  }

  createProfile(sequence, identity = {}) {
    const starSignature = sequence.slice(0, 24).map((step) => step.id).join(',');
    const seed = hashText(`${identity.cultureId || 'sky'}:${identity.landmarkId || 'atlas'}:${starSignature}`);
    const grammar = CULTURE_MUSIC_PROFILES[identity.cultureId] || FALLBACK_CULTURE_PROFILE;
    const collections = grammar.pitchCollections || (grammar.pitchCollection ? [grammar.pitchCollection] : MODES.map((entry) => entry.intervals));
    const modeIntervals = collections[seed % collections.length];
    const namedMode = MODES.find((entry) => entry.intervals === modeIntervals || entry.intervals.join(',') === modeIntervals.join(','));
    const meters = grammar.meters || METERS;
    const progressions = grammar.progressions || PROGRESSIONS;
    const meterSteps = meters[(seed >>> 3) % meters.length];
    const progression = progressions[(seed >>> 6) % progressions.length];
    const tonicSeed = grammar.tonicPolicy === 'culture' ? hashText(identity.cultureId || 'sky') : seed;
    const arpChoices = grammar.rhythm?.arpStride || [2, 3, 4];
    return {
      seed,
      cultureId: identity.cultureId || 'fallback',
      grammar,
      modeId: namedMode?.id || `${grammar.id}-collection`,
      mode: modeIntervals,
      tonic: TONICS[(tonicSeed >>> 10) % TONICS.length],
      meterSteps,
      progression,
      arpStride: arpChoices[(seed >>> 14) % arpChoices.length],
      timbre: (seed >>> 17) % 4,
      drumStyle: (seed >>> 20) % 4,
      cadence: (seed >>> 23) % 3,
    };
  }

  setSequence(sequence, identity = {}, composition = {}) {
    this.sequence = sequence || [];
    this.events = composition.events || this.sequence.map((step, index) => ({
      id: `path-${step.id}-${index}`, starIds: [step.id], stars: [step], onsetBeats: 0,
      durationBeats: clamp((step.interval || 1) * 0.5, 0.275, 1.2), intensity: 0.62,
      velocity: 1, repeat: 1, subdivisionBeats: 0.25, restBeats: 0,
      visualMode: 'path', musicalRole: 'path', seed: index + 1,
    }));
    this.arrangementMode = composition.mode || 'path';
    this.profile = this.createProfile(this.sequence, identity);
    this.motif = this.createConstellationMotif(this.sequence, identity);
    this.motifSignature = this.motif.map((entry) => `${entry.starId}:${entry.degree}:${entry.step}`).join('|');
    this.constellationGroove = this.deriveConstellationGroove(this.events);
    this.sectionPhase = 'signature';
    this.arrangementPhase = 'birth';
    this.lastBedStep = -Infinity;
    this.patterns = this.createMusicalPatterns();
    this.createTrackLanes();
    this.currentSection = 'intro';
    this.currentScene = 1;
    this.pendingScene = null;
    this.sceneAuto = true;
    this.sceneStartedBar = 0;
    this.sectionBar = 0;
    this.formBar = 0;
    this.loopSession = null;
    this.tick = 0;
    this.eventTick = 0;
    this.arrangementStep = 0;
    if (this.running && this.context) this.nextArrangementTick = this.context.currentTime + 0.035;
    if (this.delay) {
      const ratios = [0.5, 0.75, 1, 1.25];
      this.delay.delayTime.setTargetAtTime(BEAT * ratios[this.profile.timbre], this.context.currentTime, 0.04);
    }
  }

  createMusicalPatterns() {
    const culture = this.profile.cultureId;
    const rotation = this.profile.seed % this.profile.mode.length;
    const rotate = (degrees) => degrees.map((degree) => (degree + rotation) % this.profile.mode.length);
    const make = (positions, degrees, bars) => positions.map((position, index) => ({
      step: position % (bars * GROOVE_STEPS),
      degree: rotate(degrees)[index % degrees.length],
      accent: index % 4 === 0 ? 1 : index % 4 === 3 ? 0.78 : 0.9,
      star: this.sequence[index % Math.max(1, this.sequence.length)],
      index,
    }));
    if (culture === 'chinese') return {
      bass: make([0, 6, 8, 14, 16, 22, 24, 30], [0, 4, 0, 3, 0, 4, 2, 3], 2),
      synth: make([0, 3, 6, 10, 12, 15, 18, 21, 24, 27, 29], [0, 1, 2, 4, 3, 2, 0, 4, 2, 1, 3], 2),
      lead: make([4, 11, 20, 28, 36, 43, 52, 60], [2, 4, 3, 1, 0, 2, 4, 3], 4),
      synthRecipe: 'fm-metallic', acousticSlots: ['guzheng', 'dizi', 'metalPercussion'],
    };
    if (culture === 'western') return {
      bass: make([0, 3, 6, 10, 12, 14, 16, 19, 22, 26, 28, 30], [0, 0, 2, 4, 0, 2, 4, 4, 2, 0, 4, 2], 2),
      synth: make([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], [0, 2, 4, 2, 1, 3, 5, 3, 2, 4, 6, 4, 1, 3, 5, 2], 2),
      lead: make([2, 8, 14, 18, 24, 30, 34, 40, 46, 54, 60], [4, 3, 2, 0, 2, 4, 5, 4, 2, 1, 0], 4),
      synthRecipe: 'saw-sequence', acousticSlots: ['harpsichord', 'harp', 'strings'],
    };
    if (culture === 'indian') return {
      bass: make([0, 7, 8, 15, 16, 23, 24, 31], [0, 4, 0, 1, 0, 4, 2, 0], 2),
      synth: make([0, 3, 5, 8, 11, 14, 16, 19, 21, 24, 27, 30], [0, 1, 4, 2, 1, 0, 0, 2, 4, 1, 2, 0], 2),
      lead: make([3, 9, 15, 22, 29, 35, 41, 47, 55, 61], [0, 1, 4, 2, 1, 0, 4, 2, 1, 0], 4),
      synthRecipe: 'dark-pulse', acousticSlots: ['pluckedString', 'drone', 'percussion'],
    };
    if (culture === 'northern_andes') return {
      bass: make([0, 5, 8, 13, 16, 21, 24, 29], [0, 4, 0, 2, 0, 4, 1, 0], 2),
      synth: make([0, 2, 5, 7, 10, 12, 15, 18, 20, 23, 26, 28], [0, 2, 4, 2, 1, 3, 2, 0], 2),
      lead: make([3, 9, 15, 22, 27, 35, 41, 48, 55, 61], [0, 2, 4, 2, 1, 3, 2, 0], 4),
      synthRecipe: 'soft-poly', acousticSlots: ['stellar'],
    };
    const starDegrees = this.sequence.slice(0, 12).map((star, index) => this.degreeForStep(star, index));
    const degrees = starDegrees.length ? starDegrees : [0, 2, 4, 1];
    return {
      bass: make([0, 6, 8, 14, 16, 22, 24, 30], degrees, 2),
      synth: make([0, 3, 6, 8, 11, 14, 16, 19, 22, 24, 27, 30], degrees, 2),
      lead: make([4, 12, 20, 28, 36, 44, 52, 60], degrees, 4),
      synthRecipe: ['analog-pluck', 'acid-resonant', 'soft-poly', 'dark-pulse'][this.profile.timbre], acousticSlots: ['stellar'],
    };
  }

  deriveConstellationGroove(events = []) {
    const starts = [];
    const accents = [];
    let cursor = 0;
    for (const event of events.slice(0, 64)) {
      const position = Math.round(cursor * 4) % 64;
      starts.push(position);
      accents.push(clamp(Number(event.intensity || event.velocity || 0.6), 0.2, 1));
      cursor += Math.max(0.25, Number(event.durationBeats || 0.5) + Number(event.restBeats || 0));
    }
    if (!starts.length) starts.push(0, 6, 11, 14);
    const unique = (values) => [...new Set(values.map((value) => ((value % 64) + 64) % 64))];
    const kick = unique(starts.filter((position, index) => accents[index] >= 0.62 && position % 2 === 0));
    const safeKick = kick.length >= 2 ? kick : unique(starts.filter((_, index) => index % 2 === 0));
    const hats = unique(starts.flatMap((position) => [position + 2, position + 5].filter((value) => value % 4 !== 0)));
    const open = unique(starts.filter((_, index) => index % 3 === 1).map((position) => position + 3));
    const perc = unique(starts.filter((_, index) => index % 2 === 1).map((position) => position + 1));
    const bass = unique(starts.filter((_, index) => index % 2 === 0 || accents[index] > 0.78));
    const synth = unique(starts.flatMap((position, index) => [position, position + (index % 3 === 0 ? 3 : 2)]));
    return { starts: unique(starts), kick: safeKick, hats, open, perc, bass, synth, signature: unique(starts.slice(0, 16)) };
  }

  arrangementPhaseForStep(stepNumber = 0) {
    const cycle = 288;
    const phaseStep = ((stepNumber % cycle) + cycle) % cycle;
    return ARRANGEMENT_PHASES.find((phase) => phaseStep >= phase.start && phaseStep < phase.end) || ARRANGEMENT_PHASES[0];
  }

  createConstellationMotif(sequence = [], identity = {}) {
    if (!sequence.length) return [];
    const seed = hashText(`motif:${identity.cultureId || 'sky'}:${identity.landmarkId || 'landmark'}:${sequence.map((star) => star.id).join(',')}`);
    const length = clamp(4 + Math.floor(Math.sqrt(sequence.length)), 4, 8);
    const stride = 1 + (seed % Math.max(1, Math.min(4, sequence.length - 1)));
    const entries = [];
    let cursor = 0;
    const chineseContour = [0, 2, 4, 1, 3, 2, 0, 4];
    const indianContour = [0, 1, 0, 2, 3, 2, 1, 0];
    const westernContour = [0, 2, 4, 2, 1, 3, 5, 4];
    const andesContour = [0, 2, 4, 2, 1, 3, 2, 0];
    for (let index = 0; index < length; index += 1) {
      const starIndex = (index * stride + (seed >>> 7) % sequence.length) % sequence.length;
      const star = sequence[starIndex];
      const baseDegree = this.degreeForStep(star, starIndex);
      const contour = identity.cultureId === 'chinese' ? chineseContour
        : identity.cultureId === 'indian' ? indianContour
          : identity.cultureId === 'western' ? westernContour : null;
      const cultureContour = identity.cultureId === 'northern_andes' ? andesContour : contour;
      const structureBias = star?.mag != null && star.mag < 2.2 && index % 3 === 0 ? 1 : 0;
      const degree = cultureContour
        ? (cultureContour[index % cultureContour.length] + structureBias) % this.profile.mode.length
        : baseDegree;
      const gap = clamp(Math.round((star.interval || 1) * 2 + unitNoise(seed + index * 19) * 3), 2, 12);
      if (index > 0) cursor += gap;
      entries.push({
        id: `motif-${star.id}-${index}`,
        starId: star.id,
        star,
        index,
        step: index === 0 ? 0 : cursor % 128,
        degree,
        durationBeats: clamp((star.interval || 1) * 0.55, 0.38, 1.6),
        accent: index === 0 || index % 4 === 0
          ? 1
          : clamp(0.68 + (star?.mag != null ? clamp(3.4 - star.mag, 0, 2.4) * 0.06 : 0) + unitNoise(seed + index * 23) * 0.12, 0.68, 0.96),
        seed: seed + index * 101,
      });
    }
    return entries;
  }

  degreeForStep(step, index = 0) {
    const source = Math.abs((Number(step?.id) || index + 1) + index * 3);
    return source % this.profile.mode.length;
  }

  noteForStep(step, index, octave = 0) {
    return scaleNote(this.profile.tonic + octave, this.degreeForStep(step, index), this.profile.mode);
  }

  createTrackLanes() {
    this.trackLanes = new Map(TRACK_IDS.map((id, laneIndex) => {
      const names = TRACK_VARIANT_NAMES[id];
      const initial = (this.profile.seed >>> (laneIndex * 3)) % names.length;
      return [id, {
        id, variants: names.map((name, index) => ({ id: `${id}-${index}`, name, index, seed: this.profile.seed + laneIndex * 1009 + index * 97 })),
        current: initial, pending: null, manualOverride: false, overrideUntilBar: -1,
      }];
    }));
  }

  queueTrackVariant(trackId, variantIndex, source = 'manual') {
    const lane = this.trackLanes.get(trackId);
    if (!lane) return null;
    const variant = ((Number(variantIndex) % lane.variants.length) + lane.variants.length) % lane.variants.length;
    const quantum = trackId === 'synth' ? 4
      : trackId === 'bass' ? Math.max(4, Math.floor(this.profile.meterSteps / 2))
        : this.profile.meterSteps;
    const applyAtStep = Math.ceil((this.arrangementStep + 1) / quantum) * quantum;
    lane.pending = { variant, applyAtStep, source };
    if (source === 'manual') {
      lane.manualOverride = true;
      lane.overrideUntilBar = this.formBar + 8;
    }
    return { trackId, variant, applyAtStep, source };
  }

  releaseTrackOverride(trackId = null) {
    const lanes = trackId ? [this.trackLanes.get(trackId)].filter(Boolean) : [...this.trackLanes.values()];
    lanes.forEach((lane) => { lane.manualOverride = false; lane.overrideUntilBar = -1; });
    this.dispatchArrangementState();
  }

  sceneDefinition(number = this.currentScene) {
    return SCENE_BY_NUMBER.get(number) || SCENES[0];
  }

  queueScene(number, source = 'manual') {
    const scene = SCENE_BY_NUMBER.get(Number(number));
    if (!scene) return null;
    const applyAtStep = Math.ceil((this.arrangementStep + 1) / GROOVE_STEPS) * GROOVE_STEPS;
    this.pendingScene = { number: scene.number, applyAtStep, source };
    if (source === 'manual') this.sceneAuto = false;
    this.dispatchEvent(new CustomEvent('scene-queued', { detail: { scene, applyAtStep, source } }));
    return { scene, applyAtStep, source };
  }

  setSceneAuto(enabled = true) {
    this.sceneAuto = Boolean(enabled);
    this.pendingScene = null;
    this.sceneStartedBar = this.formBar;
    this.dispatchArrangementState();
  }

  applyScene(number, bar, time, source = 'auto') {
    const scene = this.sceneDefinition(number);
    const changed = scene.number !== this.currentScene;
    this.currentScene = scene.number;
    this.currentSection = scene.id;
    this.sceneStartedBar = bar;
    this.sectionBar = 0;
    if (changed || source === 'manual') {
      for (const [laneIndex, lane] of [...this.trackLanes.values()].entries()) {
        if (lane.manualOverride) continue;
        lane.current = (this.profile.seed + scene.number * 17 + laneIndex * 7) % lane.variants.length;
      }
      this.dispatchEvent(new CustomEvent('scene-change', { detail: { scene, source, audioTime: time } }));
    }
  }

  duckForManual(time = this.context?.currentTime ?? 0) {
    if (!this.arrangementBus || !this.context) return;
    const gain = this.arrangementBus.gain;
    gain.cancelScheduledValues(time);
    gain.setTargetAtTime(0.56, time, 0.012);
    gain.setTargetAtTime(ARRANGEMENT_GAIN, time + 0.12, 0.14);
    if (this.bedBus) {
      const bedGain = this.bedBus.gain;
      bedGain.cancelScheduledValues(time);
      bedGain.setTargetAtTime(BED_GAIN * 0.48, time, 0.018);
      bedGain.setTargetAtTime(BED_GAIN, time + 0.18, 0.32);
    }
  }

  outputMetrics() {
    if (!this.outputMeter) return { rms: 0, peak: 0, rmsDb: -Infinity, peakDb: -Infinity };
    const samples = new Float32Array(this.outputMeter.fftSize);
    this.outputMeter.getFloatTimeDomainData(samples);
    let square = 0; let peak = 0;
    for (const sample of samples) { square += sample * sample; peak = Math.max(peak, Math.abs(sample)); }
    const rms = Math.sqrt(square / samples.length);
    const db = (value) => value > 0 ? 20 * Math.log10(value) : -Infinity;
    return { rms, peak, rmsDb: db(rms), peakDb: db(peak) };
  }

  loopSnapshot() {
    if (!this.loopSession) return { active: false, status: 'idle', stage: null, completed: [] };
    const session = this.loopSession;
    const visibleStageIndex = session.status === 'count-in' ? session.pendingStageIndex : session.stageIndex;
    const stage = visibleStageIndex >= 0 ? LOOP_STAGES[visibleStageIndex] : null;
    const current = Math.max(session.stageStartStep, this.currentTransportPosition());
    const length = Math.max(1, session.stageEndStep - session.stageStartStep);
    const currentLayer = stage ? session.layers.get(stage.id) : null;
    const relative = Math.max(0, current - session.stageStartStep);
    const countInBeat = session.status === 'count-in' ? clamp(Math.floor(relative / 4) + 1, 1, 8) : 0;
    const beatNumber = session.status === 'count-in'
      ? countInBeat
      : clamp(Math.floor(relative / 4) + 1, 1, 16);
    const nextStage = visibleStageIndex >= 0 ? LOOP_STAGES[visibleStageIndex + 1] || null : LOOP_STAGES[0];
    return {
      active: session.active, status: session.status, stage,
      stageIndex: visibleStageIndex, completed: [...session.completed],
      resting: [...session.resting], visited: [...session.visited],
      activeLayerCount: session.completed.length, restLayerCount: session.resting.length,
      currentLayerEvents: currentLayer?.events.length || 0,
      progress: clamp((current - session.stageStartStep) / length, 0, 1),
      countInBeat, beatNumber, beatTotal: session.status === 'count-in' ? 8 : 16,
      sixteenthStep: Math.max(0, relative),
      loopBeat: session.loopOriginStep == null ? 1 : Math.floor((((current - session.loopOriginStep) % 64) + 64) % 64 / 4) + 1,
      currentStage: stage?.label || null,
      nextStage: nextStage?.label || null,
      instrument: stage?.instrument || null,
      barsRemaining: stage ? Math.max(0, stage.bars - relative / GROOVE_STEPS) : 0,
      layers: Object.fromEntries([...session.layers].map(([id, layer]) => [id, layer.events.length])),
    };
  }

  dispatchLoopState() {
    this.dispatchEvent(new CustomEvent('loop-state', { detail: this.loopSnapshot() }));
  }

  currentTransportStep() {
    if (!this.context || !this.timelineOrigin) return this.arrangementStep;
    return Math.max(0, Math.floor((this.context.currentTime - this.timelineOrigin) / SIXTEENTH));
  }

  currentTransportPosition() {
    if (!this.context || !this.timelineOrigin) return this.arrangementStep;
    return Math.max(0, (this.context.currentTime - this.timelineOrigin) / SIXTEENTH);
  }

  async startGuidedLoop() {
    await this.start();
    if (this.loopSession?.status === 'stopped' && this.loopSession.completed.length) {
      const session = this.loopSession;
      const nextBar = Math.ceil((this.arrangementStep + 1) / GROOVE_STEPS) * GROOVE_STEPS;
      session.active = true;
      session.status = 'full';
      session.stageIndex = LOOP_STAGES.length;
      session.pendingStageIndex = -1;
      session.loopOriginStep = nextBar;
      session.stageStartStep = nextBar;
      session.stageEndStep = nextBar + 64;
      session.layers.forEach((layer) => { layer.anchorStep = nextBar; });
      this.sceneAuto = false;
      this.dispatchLoopState();
      return this.loopSnapshot();
    }
    const nextBar = Math.ceil((this.arrangementStep + 1) / 4) * 4;
    this.loopSession = {
      active: true, status: 'count-in', stageIndex: -1,
      pendingStageIndex: 0, redoOnly: false,
      stageStartStep: nextBar, stageEndStep: nextBar + GROOVE_STEPS * 2,
      loopOriginStep: null,
      completed: [], resting: [], visited: [],
      layers: new Map(LOOP_STAGES.map((stage) => [stage.id, { ...stage, anchorStep: 0, events: [] }])),
    };
    this.sceneAuto = false;
    this.dispatchLoopState();
    return this.loopSnapshot();
  }

  stopGuidedLoop(clear = false) {
    if (!this.loopSession) return;
    this.loopSession.active = false;
    this.loopSession.status = clear ? 'idle' : 'stopped';
    if (clear) this.loopSession = null;
    this.dispatchLoopState();
  }

  clearCurrentLoopLayer() {
    const session = this.loopSession;
    if (!session) return null;
    const fallback = session.visited.at(-1) || session.completed.at(-1);
    const id = LOOP_STAGES[session.stageIndex]?.id || fallback;
    const layer = session.layers.get(id);
    if (layer) layer.events = [];
    session.completed = session.completed.filter((entry) => entry !== id);
    if (id && !session.resting.includes(id)) session.resting.push(id);
    this.dispatchLoopState();
    return id || null;
  }

  redoCurrentLoopLayer(requestedId = null) {
    const session = this.loopSession;
    if (!session?.active || !this.context) return null;
    const fallback = session.visited.at(-1) || session.completed.at(-1);
    const targetId = requestedId && session.layers.has(requestedId)
      ? requestedId
      : session.status === 'recording' ? LOOP_STAGES[session.stageIndex]?.id : fallback;
    const targetIndex = LOOP_STAGES.findIndex((stage) => stage.id === targetId);
    if (targetIndex < 0) return null;
    const layer = session.layers.get(targetId);
    layer.events = [];
    session.completed = session.completed.filter((entry) => entry !== targetId);
    session.resting = session.resting.filter((entry) => entry !== targetId);
    session.status = 'count-in';
    session.stageIndex = -1;
    session.pendingStageIndex = targetIndex;
    session.redoOnly = true;
    const current = this.currentTransportPosition();
    const origin = session.loopOriginStep ?? Math.ceil(current / 64) * 64;
    const cycles = Math.ceil((current + GROOVE_STEPS * 2 - origin) / 64);
    const recordStart = origin + Math.max(1, cycles) * 64;
    session.stageStartStep = recordStart - GROOVE_STEPS * 2;
    session.stageEndStep = recordStart;
    this.dispatchLoopState();
    return this.loopSnapshot();
  }

  recordLoopInput(keyIndex, options = {}) {
    const session = this.loopSession;
    if (!session?.active || session.status !== 'recording' || session.stageIndex < 0 || !this.context) return null;
    const stage = LOOP_STAGES[session.stageIndex];
    const transportStep = this.currentTransportPosition();
    const loopLength = stage.bars * GROOVE_STEPS;
    const origin = session.loopOriginStep ?? session.stageStartStep;
    const relative = ((transportStep - origin) % loopLength + loopLength) % loopLength;
    const roleGrid = options.role === 'kick' ? 4 : options.role === 'hat' ? 2 : stage.grid;
    const quantizedStep = (Math.round(relative / roleGrid) * roleGrid) % loopLength;
    const event = {
      step: quantizedStep, keyIndex, role: options.role || null,
      starId: this.sequence[keyIndex % Math.max(1, this.sequence.length)]?.id || null,
    };
    const layer = session.layers.get(stage.id);
    const duplicate = layer.events.findIndex((entry) => entry.step === event.step && entry.keyIndex === event.keyIndex);
    if (duplicate >= 0) layer.events[duplicate] = event; else layer.events.push(event);
    if (options.audition !== false) this.playLoopEvent(stage.id, event, this.context.currentTime + 0.006, true);
    this.dispatchEvent(new CustomEvent('loop-record', { detail: { stage, event, quantizedStep } }));
    this.dispatchLoopState();
    return event;
  }

  trackSnapshot() {
    return Object.fromEntries([...this.trackLanes].map(([id, lane]) => [id, {
      variant: lane.current, name: lane.variants[lane.current]?.name,
      pending: lane.pending?.variant ?? null, manualOverride: lane.manualOverride,
    }]));
  }

  markTrack(trackId, time, amount = 1, type = 'pulse', starIds = []) {
    this.trackEnvelopes[trackId] = { time, amount };
    this.dispatchEvent(new CustomEvent('track-event', { detail: {
      trackId, type, audioTime: time, intensity: amount, starIds,
      section: this.currentSection, cultureId: this.profile.cultureId,
      arrangementPhase: this.arrangementPhase, motifSignature: this.motifSignature,
    } }));
  }

  visualMusicState() {
    const clock = this.clockSnapshot();
    const envelopes = {};
    for (const id of TRACK_IDS) {
      const envelope = this.trackEnvelopes[id];
      const decay = id === 'harmony' || id === 'texture' ? 2.8 : id === 'bass' ? 0.75 : 0.32;
      envelopes[id] = clamp(envelope.amount * (1 - Math.max(0, clock.now - envelope.time) / decay), 0, 1);
    }
    const scene = this.sceneDefinition();
    const activeTracks = this.loopSession?.active ? this.loopSession.completed : scene.tracks;
    return {
      ...clock, barPhase: ((this.arrangementStep % GROOVE_STEPS) / GROOVE_STEPS),
      overallEnergy: this.loopSession?.active ? clamp(0.16 + activeTracks.length * 0.13, 0.12, 1) : scene.energy,
      kickEnvelope: envelopes.drums, percEnvelope: envelopes.drums * 0.7,
      bassEnvelope: envelopes.bass, synthEnvelope: envelopes.synth,
      padEnvelope: envelopes.harmony, textureEnvelope: envelopes.texture,
      leadEnvelope: envelopes.lead, currentSection: this.currentSection,
      currentScene: scene.number, currentSceneLabel: scene.label, sceneAuto: this.sceneAuto,
      currentCulture: this.profile.cultureId, currentArrangementMode: this.arrangementMode,
      arrangementPhase: this.arrangementPhase,
      motifSignature: this.motifSignature,
      particleMotion: (this.profile.grammar.arrangement || FALLBACK_CULTURE_PROFILE.arrangement).particleMotion,
      activeTracks, manualOverrides: [...this.trackLanes.values()].filter((lane) => lane.manualOverride).map((lane) => lane.id),
      tracks: this.trackSnapshot(),
      loop: this.loopSnapshot(),
    };
  }

  dispatchArrangementState() {
    const detail = this.visualMusicState();
    this.lastArrangementState = detail;
    this.dispatchEvent(new CustomEvent('arrangement-state', { detail }));
  }

  async toggle() {
    if (this.running) { this.stop(); return false; }
    await this.start();
    return true;
  }

  async start() {
    await this.ensure();
    if (this.running) return;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(MASTER_GAIN, this.context.currentTime, 0.025);
    this.running = true;
    this.nextTick = this.context.currentTime + 0.04;
    this.nextArrangementTick = this.nextTick;
    this.timelineOrigin = this.nextArrangementTick;
    this.arrangementStep = 0;
    this.arrangementPhase = 'birth';
    this.lastBedStep = -Infinity;
    this.timer = window.setInterval(() => this.schedule(), 18);
    this.dispatchEvent(new CustomEvent('state', { detail: { running: true } }));
  }

  stop() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    this.running = false;
    this.releaseAll(false);
    if (this.loopSession?.active) this.stopGuidedLoop(false);
    this.dispatchEvent(new CustomEvent('state', { detail: { running: false } }));
  }

  panic() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    this.running = false;
    this.releaseAll(true);
    for (const source of this.active) {
      try { source.stop(); } catch { /* source may already have ended */ }
      try { source.disconnect(); } catch { /* already disconnected */ }
    }
    this.active.clear();
    this.voices = 0;
    this.loopSession = null;
    this.dispatchLoopState();
    if (this.master && this.context) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(0.0001, now);
      this.master.gain.setTargetAtTime(MASTER_GAIN, now + 0.05, 0.04);
    }
    this.dispatchEvent(new CustomEvent('state', { detail: { running: false, panic: true } }));
  }

  schedule() {
    if (!this.running || !this.context) return;
    while (this.nextArrangementTick < this.context.currentTime + LOOK_AHEAD) {
      this.scheduleArrangement(this.arrangementStep, this.nextArrangementTick);
      this.arrangementStep += 1;
      this.nextArrangementTick += BEAT / 4;
    }
    while (this.nextTick < this.context.currentTime + LOOK_AHEAD) {
      if (this.events.length) {
        const eventIndex = this.eventTick % this.events.length;
        const event = this.events[eventIndex];
        const eventPhase = this.arrangementPhaseForStep(
          this.timelineOrigin ? Math.floor((this.nextTick - this.timelineOrigin) / SIXTEENTH) : this.arrangementStep,
        );
        const starLayerActive = !this.loopSession?.active
          && (eventPhase.id === 'birth' || this.sectionPhase === 'signature'
            || eventPhase.id === 'constellation'
            || [1, 7, 9].includes(this.currentScene)
            || (eventPhase.id === 'eclipse' && eventIndex % 4 === 0)
            || (this.sectionPhase === 'full' && eventIndex % 3 === 0));
        if (starLayerActive) this.triggerStarEvent(event, eventIndex, this.nextTick);
        const eventBeats = Math.max(0.25, Number(event.durationBeats || 0.5) + Number(event.restBeats || 0));
        this.nextTick += BEAT * eventBeats;
        const firstStar = event.stars?.[0];
        const stepIndex = firstStar ? this.sequence.findIndex((step) => step.id === firstStar.id) : -1;
        this.dispatchEvent(new CustomEvent('step', { detail: {
          index: stepIndex, tick: this.tick, eventIndex, loopStart: eventIndex === 0,
          mode: this.arrangementMode, event,
        } }));
        this.eventTick += 1;
      } else this.nextTick += EIGHTH;
      this.tick += 1;
    }
  }

  async audition(step, index = 0) {
    await this.ensure();
    this.triggerStep(step, index, this.context.currentTime + 0.01, true);
  }

  clockSnapshot() {
    const now = this.context?.currentTime ?? performance.now() / 1000;
    const beat = now / BEAT;
    return {
      now,
      beat,
      beatPhase: beat - Math.floor(beat),
      twoBarIndex: Math.floor(now / TWO_BARS),
      bpm: BPM,
    };
  }

  interactionSnapshot(id) {
    const session = this.interactions.get(id);
    if (!session) return null;
    const clock = this.clockSnapshot();
    return {
      id,
      index: session.index,
      starId: session.step.id,
      pressedAt: session.pressedAt,
      holdDuration: Math.max(0, clock.now - session.pressedAt),
      holding: session.holding,
      density: session.density,
      cutoff: session.cutoff,
      octave: session.octave,
      beatPhase: clock.beatPhase,
      twoBarIndex: clock.twoBarIndex,
    };
  }

  async press(step, index = 0, id = `step:${index}`) {
    await this.ensure();
    if (!step) return null;
    if (this.interactions.has(id)) this.release(id, true);
    if (this.interactions.size >= MAX_INTERACTIONS) {
      const oldest = [...this.interactions.values()].sort((a, b) => a.pressedAt - b.pressedAt)[0];
      if (oldest) this.release(oldest.id, false);
    }
    const now = this.context.currentTime;
    const magnitude = Number.isFinite(step.mag) ? step.mag : 4;
    const session = {
      id,
      step,
      index,
      pressedAt: now,
      holding: false,
      density: 7,
      cutoff: clamp(3900 - magnitude * 320, 1300, 4300),
      octave: 0,
      parameterEpoch: -1,
      nextPulse: now,
      nextGrain: now,
      grainCount: 0,
      holdTimer: null,
      seed: Math.abs((Number(step.id) || index + 1) * 37 + index * 101),
    };
    this.interactions.set(id, session);
    this.duckForManual(now);
    this.starInstrumentAttack(step, index, now + 0.006);
    session.holdTimer = window.setTimeout(() => this.beginHold(id), HOLD_THRESHOLD_MS);
    this.dispatchEvent(new CustomEvent('gesture', { detail: { phase: 'press', ...this.interactionSnapshot(id) } }));
    return this.interactionSnapshot(id);
  }

  beginHold(id) {
    const session = this.interactions.get(id);
    if (!session || session.holding || !this.context) return;
    const now = this.context.currentTime;
    session.holding = true;
    session.nextPulse = Math.ceil(now / BEAT) * BEAT;
    session.nextGrain = now + 0.015;
    this.updateInteractionParameters(session, now);
    this.ensureInteractionTimer();
    this.dispatchEvent(new CustomEvent('gesture', { detail: { phase: 'hold', ...this.interactionSnapshot(id) } }));
  }

  updateInteractionParameters(session, time) {
    const epoch = Math.floor(time / TWO_BARS);
    if (epoch === session.parameterEpoch) return;
    session.parameterEpoch = epoch;
    const duration = Math.max(0, time - session.pressedAt);
    const densityDrift = 0.92 + unitNoise(session.seed + epoch * 3) * 0.16;
    const cutoffDrift = 0.84 + unitNoise(session.seed + epoch * 3 + 1) * 0.32;
    const octaveChoice = Math.floor(unitNoise(session.seed + epoch * 3 + 2) * 7);
    session.density = clamp((7 + duration * 0.72) * densityDrift, 6.5, 14.5);
    session.cutoff = clamp((3600 - (session.step.mag ?? 4) * 270) * cutoffDrift, 1100, 5200);
    session.octave = octaveChoice === 0 ? -12 : octaveChoice === 6 ? 12 : 0;
  }

  ensureInteractionTimer() {
    if (!this.interactionTimer) this.interactionTimer = window.setInterval(() => this.scheduleInteractions(), 18);
  }

  scheduleInteractions() {
    if (!this.context || !this.interactions.size) return;
    const now = this.context.currentTime;
    const horizon = now + LOOK_AHEAD;
    for (const session of this.interactions.values()) {
      if (!session.holding) continue;
      this.updateInteractionParameters(session, now);
      session.nextPulse = Math.max(session.nextPulse, now + 0.006);
      session.nextGrain = Math.max(session.nextGrain, now + 0.006);
      while (session.nextPulse < horizon) {
        this.gesturePulse(session, session.nextPulse);
        session.nextPulse += BEAT;
      }
      while (session.nextGrain < horizon) {
        this.gestureGrain(session, session.nextGrain);
        session.grainCount += 1;
        session.nextGrain += 1 / session.density;
      }
    }
  }

  release(id, immediate = false) {
    const session = this.interactions.get(id);
    if (!session) return;
    if (session.holdTimer) window.clearTimeout(session.holdTimer);
    if (!immediate && this.context) this.releaseTail(session, this.context.currentTime + 0.006);
    this.interactions.delete(id);
    this.dispatchEvent(new CustomEvent('gesture', {
      detail: { phase: immediate ? 'cancel' : 'release', id, index: session.index, starId: session.step.id },
    }));
    if (!this.interactions.size && this.interactionTimer) {
      window.clearInterval(this.interactionTimer);
      this.interactionTimer = null;
    }
  }

  releaseAll(immediate = false) {
    for (const id of this.interactions.keys()) this.release(id, immediate);
  }

  connectGesture(node) {
    node.connect(this.gestureBus);
    node.connect(this.reverbSend);
  }

  connectBed(node, reverbAmount = 0.18) {
    if (!this.bedBus) return;
    node.connect(this.bedBus);
    if (reverbAmount > 0 && this.reverbSend) {
      const send = this.context.createGain();
      send.gain.value = reverbAmount;
      node.connect(send).connect(this.reverbSend);
    }
  }

  prioritizeManualVoices(reserve = 4) {
    if (this.voices < MAX_VOICES - reserve) return;
    const sources = [...this.active].slice(0, reserve + 2);
    sources.forEach((source) => {
      try { source.stop(this.context.currentTime + 0.002); } catch { /* source already ended */ }
    });
    this.voices = Math.max(0, this.voices - sources.length);
  }

  async performanceKick() {
    await this.ensure();
    this.prioritizeManualVoices(3);
    const time = this.context.currentTime + 0.004;
    this.duckForManual(time);
    this.technoKick(time, 0.096, this.drumPalette().kick, 'gesture');
    this.markTrack('drums', time, 0.96, 'kick', [this.sequence[0]?.id].filter(Boolean));
    return time;
  }

  async performanceHat() {
    await this.ensure();
    this.prioritizeManualVoices(2);
    const time = this.context.currentTime + 0.004;
    this.duckForManual(time);
    this.sampleHat(time, Math.max(0.014, this.drumPalette().hatGain * 1.18), 0, 'gesture');
    this.markTrack('drums', time, 0.58, 'closed-hat', [this.sequence[1]?.id || this.sequence[0]?.id].filter(Boolean));
    return time;
  }

  starInstrumentAttack(step, index, time) {
    this.prioritizeManualVoices(4);
    const magnitude = Number.isFinite(step.mag) ? step.mag : 4;
    const velocity = clamp(1.08 - (magnitude + 1.3) / 8.5, 0.52, 0.96);
    const note = this.noteForStep(step, index, 12);
    const pan = clamp((step.pan ?? 0) * 0.82, -0.88, 0.88);
    const instrument = Math.abs((Number(step.id) || index) + index * 3 + this.profile.seed) % 5;
    if (this.voices >= MAX_VOICES - 3) {
      this.emergencyStarAttack(note, time, 0.034 * velocity, pan);
      return;
    }
    if (instrument === 0) this.gestureInstrumentTone(note, time, 0.82, 0.036 * velocity, pan, 'bell');
    else if (instrument === 1) this.gestureInstrumentTone(note, time, 0.48, 0.044 * velocity, pan, 'keys');
    else if (instrument === 2) this.gestureInstrumentTone(note, time, 0.38, 0.035 * velocity, pan, 'synth');
    else if (instrument === 3) this.gestureInstrumentTone(note - 12, time, 0.55, 0.05 * velocity, pan, 'bass');
    else this.gestureMallet(note, time, 0.04 * velocity, pan, index + this.profile.seed);
  }

  emergencyStarAttack(note, time, gain, pan) {
    if (!this.context || this.voices >= MAX_VOICES) return;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    const panner = this.context.createStereoPanner();
    oscillator.type = 'triangle';
    oscillator.frequency.value = midi(note);
    envelope.gain.setValueAtTime(Math.max(0.018, gain), time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    panner.pan.value = pan;
    oscillator.connect(envelope).connect(panner);
    this.connectGesture(panner);
    this.register(oscillator);
    oscillator.start(time); oscillator.stop(time + 0.24);
  }

  gestureInstrumentTone(note, time, duration, gain, pan, instrument) {
    if (this.voices >= MAX_VOICES - 3) return;
    const voices = {
      bell: [['sine', 1, 0.72], ['sine', 2.01, 0.25], ['sine', 3.93, 0.09]],
      keys: [['triangle', 1, 0.68], ['sine', 2, 0.22]],
      synth: [['sawtooth', 1, 0.26], ['triangle', 1.005, 0.7]],
      bass: [['sine', 1, 0.82], ['triangle', 2, 0.16]],
    }[instrument];
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    const panner = this.context.createStereoPanner();
    filter.type = 'lowpass';
    filter.Q.value = instrument === 'synth' ? 4.2 : 1.25;
    filter.frequency.setValueAtTime(instrument === 'bass' ? 780 : instrument === 'bell' ? 6800 : 3400, time);
    if (instrument === 'synth') filter.frequency.exponentialRampToValueAtTime(820, time + duration);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(gain, time + (instrument === 'keys' ? 0.018 : 0.006));
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    panner.pan.value = pan;
    voices.forEach(([type, ratio, level]) => {
      const oscillator = this.context.createOscillator();
      const partial = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = midi(note) * ratio;
      partial.gain.value = level;
      oscillator.connect(partial).connect(filter);
      this.register(oscillator);
      oscillator.start(time); oscillator.stop(time + duration + 0.035);
    });
    filter.connect(envelope).connect(panner);
    this.connectGesture(panner);
  }

  gestureMallet(note, time, gain, pan, seed) {
    if (this.voices >= MAX_VOICES - 1) return;
    const oscillator = this.context.createOscillator();
    const resonator = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    const panner = this.context.createStereoPanner();
    oscillator.type = 'sine'; oscillator.frequency.value = midi(note);
    resonator.type = 'bandpass'; resonator.frequency.value = midi(note) * 2; resonator.Q.value = 7.5;
    envelope.gain.setValueAtTime(gain, time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.31);
    panner.pan.value = pan;
    oscillator.connect(resonator).connect(envelope).connect(panner);
    this.connectGesture(panner);
    this.register(oscillator);
    oscillator.start(time); oscillator.stop(time + 0.34);
    this.gestureNoise(time, 0.045, gain * 0.22, midi(note) * 2.4, 11, pan, seed);
  }

  gesturePulse(session, time) {
    if (this.voices >= MAX_VOICES) return;
    const ac = this.context;
    const note = this.noteForStep(session.step, session.index, session.octave);
    const oscillator = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const envelope = ac.createGain();
    const panner = ac.createStereoPanner();
    oscillator.type = ['sine', 'triangle', 'sine', 'triangle'][this.profile.timbre];
    oscillator.frequency.value = midi(note);
    filter.type = 'lowpass'; filter.Q.value = 3.2; filter.frequency.value = session.cutoff;
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(0.028, time + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.21);
    panner.pan.value = clamp((session.step.pan ?? 0) * 0.7, -0.8, 0.8);
    oscillator.connect(filter).connect(envelope).connect(panner);
    this.connectGesture(panner);
    this.register(oscillator);
    oscillator.start(time); oscillator.stop(time + 0.24);
  }

  gestureGrain(session, time) {
    const spread = unitNoise(session.seed + session.grainCount * 5 + session.parameterEpoch * 19);
    const duration = 0.045 + spread * 0.055;
    const frequency = clamp(session.cutoff * (0.72 + spread * 0.62), 800, 6500);
    const pan = clamp((session.step.pan ?? 0) * 0.5 + (spread - 0.5) * 0.55, -0.9, 0.9);
    this.gestureNoise(time, duration, 0.0055, frequency, 7 + spread * 8, pan, session.grainCount + session.seed);
  }

  gestureNoise(time, duration, gain, frequency, q, pan, seed) {
    if (this.voices >= MAX_VOICES) return;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    const panner = this.context.createStereoPanner();
    source.buffer = this.noiseBuffer;
    filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = q;
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(gain, time + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    panner.pan.value = pan;
    source.connect(filter).connect(envelope).connect(panner);
    this.connectGesture(panner);
    this.register(source);
    const offset = unitNoise(seed) * Math.max(0.1, this.noiseBuffer.duration - duration);
    source.start(time, offset, duration); source.stop(time + duration + 0.02);
  }

  releaseTail(session, time) {
    if (this.voices >= MAX_VOICES) return;
    const ac = this.context;
    const note = this.noteForStep(session.step, session.index, session.octave);
    const oscillator = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const envelope = ac.createGain();
    const panner = ac.createStereoPanner();
    oscillator.type = ['triangle', 'sine', 'triangle', 'sine'][this.profile.timbre]; oscillator.frequency.value = midi(note);
    filter.type = 'lowpass'; filter.Q.value = 2.8;
    filter.frequency.setValueAtTime(Math.max(900, session.cutoff), time);
    filter.frequency.exponentialRampToValueAtTime(420, time + 0.9);
    envelope.gain.setValueAtTime(0.022, time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.95);
    panner.pan.setValueAtTime(clamp(session.step.pan ?? 0, -0.8, 0.8), time);
    panner.pan.linearRampToValueAtTime(0, time + 0.9);
    oscillator.connect(filter).connect(envelope).connect(panner);
    this.connectGesture(panner);
    this.register(oscillator);
    oscillator.start(time); oscillator.stop(time + 1.02);
    this.gestureNoise(time, 0.58, 0.0045, 1100, 3.5, panner.pan.value, session.seed + 999);
  }

  triggerStep(step, index, time, emphatic, includeKick = true) {
    if (!step || !this.context || !this.master) return;
    const magnitude = Number.isFinite(step.mag) ? step.mag : 4;
    const velocity = clamp(1.05 - (magnitude + 1.3) / 8.5, 0.18, 0.92);
    const isCadence = index === this.sequence.length - 1;
    const base = isCadence
      ? scaleNote(this.profile.tonic, this.profile.cadence === 1 ? 4 : 0, this.profile.mode)
      : this.noteForStep(step, index);
    const duration = EIGHTH * clamp(step.interval || 1, 0.55, 2.5);
    const pan = clamp((step.pan ?? 0) * 0.8, -0.85, 0.85);
    const gain = (emphatic ? 0.052 : 0.034) * velocity;
    const role = index % 8;

    if (role === 0) {
      if (includeKick) this.kick(time, 0.035 + velocity * 0.035);
      this.tone(base - 12, time, duration * 1.8, gain * 0.75, 'sine', 1000, pan);
    } else if (role === 1 || role === 5) {
      this.tone(base + 12, time, Math.max(0.045, duration * 0.55), gain, 'triangle', 4200 + velocity * 1800, pan);
    } else if (role === 2) {
      this.noiseHit(time, Math.max(0.025, duration * 0.22), gain * 0.55, 4800 + velocity * 3000, 5, pan);
    } else if (role === 3 || role === 7) {
      this.sweep(base + 7, time, duration * 1.25, gain * 0.65, 700, 4200, 'triangle', pan);
    } else if (role === 4) {
      this.tone(base, time, duration * 1.4, gain * 0.7, 'square', 2400, pan);
    } else {
      this.tone(base + 19, time, Math.max(0.035, duration * 0.4), gain * 0.7, 'triangle', 6200, pan);
    }
  }

  selectEventVoices(event) {
    const stars = event.stars || [];
    if (!stars.length) return [];
    const grammar = this.profile.grammar;
    const baseIndex = this.sequence.findIndex((step) => step.id === stars[0].id);
    const baseDegree = this.degreeForStep(stars[0], Math.max(0, baseIndex));
    let notes;
    if (grammar.voicing === 'open-pentatonic') {
      const offsets = [0, 4, 7, 12, 16];
      notes = stars.map((_, index) => this.profile.tonic + this.profile.mode[baseDegree % this.profile.mode.length] + offsets[index % offsets.length]);
    } else if (grammar.voicing === 'modal-vertical') {
      const degrees = [0, 2, 4, 6, 8];
      notes = stars.map((_, index) => scaleNote(this.profile.tonic, baseDegree + degrees[index % degrees.length], this.profile.mode));
    } else if (grammar.voicing === 'tonic-orbit') {
      notes = [this.profile.tonic, this.profile.tonic + 7, ...stars.map((star, index) => this.noteForStep(star, index, index % 2 ? 12 : 0))];
    } else if (grammar.voicing === 'airy-ostinato') {
      notes = stars.map((star, index) => this.noteForStep(star, index, index % 2 ? 12 : 0));
    } else notes = stars.map((star, index) => this.noteForStep(star, index, index > 2 ? 12 : 0));
    const unique = [];
    for (const note of notes) {
      const bounded = clamp(Math.round(note), 36, 88);
      if (!unique.some((existing) => Math.abs(existing - bounded) < 2 || Math.abs(existing - bounded) === 12)) unique.push(bounded);
      if (unique.length >= clamp(grammar.voiceCount || 4, 3, 5)) break;
    }
    return unique.length ? unique : [this.profile.tonic];
  }

  profileChord(degree = 0) {
    const grammar = this.profile.grammar;
    if (grammar.voicing === 'open-pentatonic') {
      const root = scaleNote(this.profile.tonic, degree, this.profile.mode);
      return [root, root + 7, root + 12];
    }
    if (grammar.voicing === 'tonic-orbit') return [this.profile.tonic - 12, this.profile.tonic, this.profile.tonic + 7];
    if (grammar.voicing === 'airy-ostinato') {
      const root = scaleNote(this.profile.tonic, degree, this.profile.mode);
      return [root, root + 12, scaleNote(this.profile.tonic + 12, degree + 2, this.profile.mode)];
    }
    return [0, 2, 4].map((offset) => scaleNote(this.profile.tonic, degree + offset, this.profile.mode));
  }

  triggerStarEvent(event, eventIndex, time) {
    if (!event?.stars?.length || !this.context) return;
    const repeats = clamp(Math.round(event.repeat || 1), 1, 4);
    const subdivision = BEAT * clamp(event.subdivisionBeats || 0.25, 0.25, 1);
    const visualStars = event.stars.map((star) => ({ id: star.id, ra: star.ra, dec: star.dec, mag: star.mag }));
    for (let repeatIndex = 0; repeatIndex < repeats; repeatIndex += 1) {
      const when = time + repeatIndex * subdivision;
      if (this.arrangementMode === 'path') {
        const step = event.stars[0];
        const index = Math.max(0, this.sequence.findIndex((candidate) => candidate.id === step.id));
        this.triggerStep(step, index, when, false, false);
      } else {
        const notes = this.selectEventVoices(event);
        const fragment = this.arrangementMode === 'fragment';
        const duration = fragment ? BEAT * (0.18 + (event.seed % 3) * 0.055) : BEAT * clamp(event.durationBeats || 0.8, 0.45, 1.8);
        const articulation = this.profile.grammar.fragment?.articulation || 'stellar';
        notes.forEach((note, voiceIndex) => {
          const star = event.stars[voiceIndex % event.stars.length];
          const pan = clamp((star?.pan ?? 0) * this.profile.grammar.spatial, -0.86, 0.86);
          const gain = (fragment ? 0.0125 : 0.0105) * clamp(event.intensity || 0.65, 0.35, 1);
          const type = articulation === 'metallic' ? (voiceIndex ? 'triangle' : 'sine')
            : articulation === 'airy-pulse' ? 'triangle'
              : articulation === 'ornament-orbit' ? 'sine'
                : ['triangle', 'sine', 'square'][voiceIndex % 3];
          const cutoff = fragment ? 3900 + voiceIndex * 720 : 2100 + voiceIndex * 480;
          this.tone(note, when + voiceIndex * (fragment ? 0.008 : 0.014), duration, gain, type, cutoff, pan);
        });
        if (fragment && event.musicalRole === 'accent') {
          const star = event.stars[event.stars.length - 1];
          this.noiseHit(when, 0.035, 0.0045, 5200 + (event.seed % 5) * 420, 8, (star?.pan ?? 0) * 0.5);
        }
      }
      this.dispatchEvent(new CustomEvent('star-event', { detail: {
        event: { ...event, stars: visualStars }, eventIndex, repeatIndex, audioTime: when,
        mode: this.arrangementMode, profileId: this.profile.grammar.id,
      } }));
    }
  }

  scheduleArrangement(stepNumber, time) {
    if (!this.sequence.length || !this.arrangementBus) return;
    const phase = this.arrangementPhaseForStep(stepNumber);
    this.arrangementPhase = phase.id;
    this.sectionPhase = stepNumber < SECTION_A_STEPS ? 'signature'
      : stepNumber < SECTION_A_STEPS + 32 ? 'full' : 'variation';
    const cycleStep = stepNumber % GROOVE_STEPS;
    const cycleIndex = Math.floor(stepNumber / GROOVE_STEPS);
    this.updateLoopSession(stepNumber, time);
    this.updateArrangementDirector(stepNumber, time);
    const progressionIndex = cycleIndex % this.profile.progression.length;
    const chordDegree = this.profile.progression[progressionIndex];
    const sourceStep = this.sequence[stepNumber % this.sequence.length];
    const nextStep = this.sequence[(stepNumber * 3 + 1) % this.sequence.length] || sourceStep;
    if (!this.loopSession?.active) {
      const fullLaunch = this.sectionPhase !== 'signature';
      this.scheduleCosmicBed(stepNumber, time, sourceStep);
      this.scheduleMotifLane(stepNumber, time);
      const birth = phase.id === 'birth';
      const eclipse = phase.id === 'eclipse';
      if (!birth && !eclipse && (fullLaunch || this.trackIsActive('drums'))) this.scheduleDrumLane(cycleStep, cycleIndex, time, sourceStep, nextStep);
      if (!birth && !eclipse && (fullLaunch || this.trackIsActive('bass'))) this.scheduleBassLane(cycleStep, cycleIndex, chordDegree, time, sourceStep);
      if (!birth && (fullLaunch || this.trackIsActive('synth'))) this.scheduleSynthLane(cycleStep, cycleIndex, chordDegree, time, nextStep);
      if (!birth && !eclipse && (fullLaunch || this.trackIsActive('harmony'))) this.scheduleHarmonyLane(cycleStep, cycleIndex, chordDegree, progressionIndex, time);
      if (!birth && !eclipse && (fullLaunch || this.trackIsActive('lead'))) this.scheduleLeadLane(cycleStep, cycleIndex, chordDegree, time, sourceStep);
      if (fullLaunch || this.trackIsActive('texture')) this.scheduleTextureLane(cycleStep, cycleIndex, time, nextStep);
    }
    this.scheduleLoopPlayback(stepNumber, time);
  }

  updateArrangementDirector(stepNumber, time) {
    const bar = Math.floor(stepNumber / GROOVE_STEPS);
    this.formBar = bar;
    for (const lane of this.trackLanes.values()) {
      if (lane.pending && stepNumber >= lane.pending.applyAtStep) {
        lane.current = lane.pending.variant;
        const source = lane.pending.source;
        lane.pending = null;
        this.dispatchEvent(new CustomEvent('track-change', { detail: { trackId: lane.id, variant: lane.current, source, audioTime: time } }));
      }
      if (lane.manualOverride && bar >= lane.overrideUntilBar) {
        lane.manualOverride = false; lane.overrideUntilBar = -1;
      }
    }
    if (this.pendingScene && stepNumber >= this.pendingScene.applyAtStep) {
      const pending = this.pendingScene;
      this.pendingScene = null;
      this.applyScene(pending.number, bar, time, pending.source);
    }
    if (stepNumber % GROOVE_STEPS !== 0) return;
    this.sectionBar = Math.max(0, bar - this.sceneStartedBar);
    const scene = this.sceneDefinition();
    if (this.sceneAuto && this.sectionBar >= scene.bars) {
      const order = AUTO_SCENE_ORDERS[this.profile.cultureId] || AUTO_SCENE_ORDERS.fallback;
      const position = Math.max(0, order.indexOf(this.currentScene));
      this.applyScene(order[(position + 1) % order.length], bar, time, 'auto');
    }
    this.dispatchArrangementState();
  }

  updateLoopSession(stepNumber, time) {
    const session = this.loopSession;
    if (!session?.active) return;
    if (session.status === 'count-in') {
      if (stepNumber >= session.stageStartStep && stepNumber < session.stageEndStep && (stepNumber - session.stageStartStep) % 4 === 0) {
        const accent = stepNumber === session.stageStartStep;
        this.samplePerc(time, accent ? 0.0065 : 0.0038, 0, accent ? 1650 : 2350);
        this.markTrack('drums', time, accent ? 0.9 : 0.52, 'count-in');
        this.dispatchLoopState();
      }
      if (stepNumber >= session.stageEndStep) this.beginLoopStage(session.pendingStageIndex ?? 0, session.stageEndStep);
      return;
    }
    if (session.status === 'recording' && stepNumber >= session.stageEndStep) {
      const stage = LOOP_STAGES[session.stageIndex];
      const layer = session.layers.get(stage.id);
      layer.anchorStep = session.loopOriginStep ?? session.stageStartStep;
      if (!session.visited.includes(stage.id)) session.visited.push(stage.id);
      if (layer.events.length) {
        if (!session.completed.includes(stage.id)) session.completed.push(stage.id);
        session.resting = session.resting.filter((entry) => entry !== stage.id);
      } else {
        session.completed = session.completed.filter((entry) => entry !== stage.id);
        if (!session.resting.includes(stage.id)) session.resting.push(stage.id);
      }
      if (session.redoOnly) {
        session.redoOnly = false;
        session.pendingStageIndex = -1;
        session.status = 'full';
        session.stageIndex = LOOP_STAGES.length;
        this.dispatchLoopState();
        return;
      }
      const nextIndex = session.stageIndex + 1;
      if (nextIndex >= LOOP_STAGES.length) {
        session.status = 'full';
        session.stageIndex = LOOP_STAGES.length;
        this.dispatchLoopState();
      } else this.beginLoopStage(nextIndex, session.stageEndStep);
    }
    if (stepNumber % 4 === 0) this.dispatchLoopState();
  }

  beginLoopStage(index, startStep) {
    const session = this.loopSession;
    const stage = LOOP_STAGES[index];
    if (!session || !stage) return;
    session.status = 'recording';
    session.stageIndex = index;
    session.pendingStageIndex = -1;
    session.stageStartStep = startStep;
    session.stageEndStep = startStep + stage.bars * GROOVE_STEPS;
    if (session.loopOriginStep == null) session.loopOriginStep = startStep;
    const layer = session.layers.get(stage.id);
    layer.anchorStep = session.loopOriginStep;
    layer.events = [];
    this.dispatchLoopState();
  }

  trackIsActive(trackId) {
    const lane = this.trackLanes.get(trackId);
    return Boolean(lane?.manualOverride || this.sceneDefinition().tracks.includes(trackId));
  }

  laneVariant(trackId) { return this.trackLanes.get(trackId)?.current || 0; }

  drumPalette() {
    const culture = this.profile.cultureId;
    if (culture === 'chinese') return { kick: 0, hatGain: 0.010, openGain: 0.010, percFreq: 4100, percGain: 0.010, variant: 0 };
    if (culture === 'western') return { kick: 1, hatGain: 0.013, openGain: 0.016, percFreq: 2500, percGain: 0.013, variant: 1 };
    if (culture === 'indian') return { kick: 2, hatGain: 0.009, openGain: 0.012, percFreq: 1800, percGain: 0.012, variant: 2 };
    if (culture === 'northern_andes') return { kick: 3, hatGain: 0.011, openGain: 0.014, percFreq: 3200, percGain: 0.012, variant: 3 };
    return { kick: this.laneVariant('drums'), hatGain: 0.011, openGain: 0.013, percFreq: 2300, percGain: 0.011, variant: this.laneVariant('drums') };
  }

  motifNote(entry, octave = 12) {
    if (!entry) return this.profile.tonic + octave;
    const starIndex = Math.max(0, this.sequence.findIndex((star) => star.id === entry.starId));
    const register = this.profile.grammar.register?.base || 0;
    return scaleNote(this.profile.tonic + octave + register, entry.degree + (starIndex % 3 === 2 ? 1 : 0), this.profile.mode);
  }

  scheduleCosmicBed(stepNumber, time, sourceStep) {
    const phase = this.arrangementPhase;
    const interval = phase === 'birth' ? 32 : phase === 'orbit' ? 64 : phase === 'constellation' ? 48 : 64;
    if (stepNumber !== 0 && stepNumber % interval !== 0) return;
    if (this.lastBedStep === stepNumber) return;
    this.lastBedStep = stepNumber;
    const grammar = this.profile.grammar;
    const motifEntries = this.motif.slice(0, 3);
    const motifNotes = motifEntries.map((entry, index) => this.motifNote(entry, index === 0 ? -12 : 0));
    let notes = motifNotes.length ? motifNotes : [this.profile.tonic];
    if (grammar.voicing === 'tonic-orbit') notes = [this.profile.tonic - 12, this.profile.tonic + 7, ...notes.slice(0, 1)];
    else if (grammar.voicing === 'open-pentatonic') notes = [notes[0], notes[0] + 7, notes[1] || notes[0] + 12];
    else if (grammar.voicing === 'modal-vertical') notes = [notes[0], notes[0] + 5, notes[1] || notes[0] + 9];
    else notes = [...notes, this.profile.tonic + 7];
    const eclipse = phase === 'eclipse';
    const duration = BEAT * (eclipse ? 14 : phase === 'birth' ? 18 : 24);
    const gain = eclipse ? 0.003 : phase === 'birth' ? 0.0046 : 0.004;
    const pan = clamp((sourceStep?.pan ?? 0) * (grammar.spatial || 0.6) * 0.45, -0.55, 0.55);
    this.spaceAtmosphere(notes.slice(0, grammar.voicing === 'modal-vertical' ? 3 : 2), time, duration, gain, pan);
    this.markTrack('harmony', time, eclipse ? 0.28 : 0.48, eclipse ? 'eclipse-bed' : 'cosmic-bed', motifEntries.map((entry) => entry.starId));
  }

  scheduleMotifLane(stepNumber, time) {
    if (!this.motif.length) return;
    const cycleStep = stepNumber % 128;
    const entry = this.motif.find((candidate) => candidate.step === cycleStep);
    if (!entry) return;
    if (this.arrangementPhase === 'eclipse' && entry.index % 2 === 1) return;
    const note = this.motifNote(entry, this.profile.cultureId === 'indian' ? 0 : 12);
    const duration = BEAT * (this.arrangementPhase === 'birth' ? entry.durationBeats * 0.88 : entry.durationBeats);
    const gain = 0.0155 * entry.accent * (this.arrangementPhase === 'eclipse' ? 0.62 : 1);
    const star = entry.star;
    const pan = clamp((star?.pan ?? 0) * (this.profile.grammar.spatial || 0.6), -0.8, 0.8);
    if (this.profile.cultureId === 'indian') this.ornamentLead(note, time, duration * 1.25, gain * 0.82, pan);
    else this.melodicVoice(note, time, duration, gain, pan);
    this.markTrack('lead', time, entry.accent, 'constellation-motif', [entry.starId]);
  }

  scheduleDrumLane(step, bar, time, sourceStep, nextStep) {
    const scene = this.currentScene;
    const culture = this.profile.cultureId;
    const palette = this.drumPalette();
    const grooveStep = ((bar % 4) * GROOVE_STEPS + step) % 64;
    const groove = this.constellationGroove;
    const signature = this.sectionPhase === 'signature';
    const kicks = groove.kick.length ? groove.kick : [0, 8];
    if (!signature && kicks.includes(grooveStep)) {
      const accent = groove.starts.includes(grooveStep);
      this.technoKick(time, accent ? 0.105 : 0.082, palette.kick);
      this.pump(time, step === 0 ? 0.43 : 0.5);
      this.markTrack('drums', time, accent ? 1 : 0.68, 'kick', [sourceStep?.id].filter(Boolean));
    }
    const dense = scene === 5 || scene === 8 || this.sectionPhase === 'variation';
    const closed = groove.hats.filter((position) => position % 16 === grooveStep % 16);
    if (closed.length && (!signature || grooveStep % 8 === 2 || grooveStep % 8 === 6)) {
      this.sampleHat(time, palette.hatGain * (dense ? 1.12 : 0.82), (nextStep?.pan ?? 0) * 0.42);
      this.markTrack('drums', time, 0.36, 'closed-hat', [nextStep?.id].filter(Boolean));
    }
    const open = groove.open.filter((position) => position % 16 === grooveStep % 16);
    if (open.length && !signature && scene >= 2) {
      this.sampleOpenHat(time, palette.openGain, (sourceStep?.pan ?? 0) * -0.35);
      this.markTrack('drums', time, 0.48, 'open-hat', [sourceStep?.id].filter(Boolean));
    }
    const perc = groove.perc.filter((position) => position % 16 === grooveStep % 16);
    if (perc.length && (!signature || grooveStep % 16 === 7 || grooveStep % 16 === 15)) {
      if (culture === 'western' && !signature) this.sampleClap(time, palette.percGain, sourceStep?.pan ?? 0);
      else this.samplePerc(time, palette.percGain * (signature ? 0.72 : 1), sourceStep?.pan ?? 0, palette.percFreq);
      this.markTrack('drums', time, 0.54, 'perc', [sourceStep?.id].filter(Boolean));
    }
  }

  scheduleBassLane(step, bar, chordDegree, time, sourceStep) {
    const culture = this.profile.cultureId;
    const patternStep = (bar % 2) * GROOVE_STEPS + step;
    const grooveStep = ((bar % 4) * GROOVE_STEPS + step) % 64;
    if (this.sectionPhase === 'signature' && !this.constellationGroove.bass.includes(grooveStep)) return;
    const event = this.patterns.bass.find((entry) => entry.step === patternStep);
    if (!event) return;
    const eightBarPhase = Math.floor(bar / 8);
    let degree = event.degree;
    if (culture === 'western') degree += chordDegree;
    if (event.index === this.patterns.bass.length - 1 && eightBarPhase % 2 === 1) degree += culture === 'indian' ? 1 : 2;
    const note = scaleNote(this.profile.tonic - 12, degree, this.profile.mode);
    const gain = this.currentScene === 4 || this.currentScene === 8 ? 0.04 : culture === 'indian' ? 0.031 : 0.035;
    this.electricBass(note, time, BEAT * (culture === 'chinese' ? 0.82 : 0.58), gain * event.accent);
    this.markTrack('bass', time, 0.78, 'bass', [sourceStep?.id].filter(Boolean));
  }

  scheduleSynthLane(step, bar, chordDegree, time, star) {
    const culture = this.profile.cultureId;
    const patternStep = (bar % 2) * GROOVE_STEPS + step;
    const grooveStep = ((bar % 4) * GROOVE_STEPS + step) % 64;
    if (this.sectionPhase === 'signature' && !this.constellationGroove.synth.includes(grooveStep)) return;
    const event = this.patterns.synth.find((entry) => entry.step === patternStep);
    if (!event) return;
    const variation = Math.floor(bar / 8);
    if (variation % 4 === 2 && event.index % 7 === 5) return;
    let degree = event.degree + (culture === 'western' ? chordDegree : 0);
    if (event.index === this.patterns.synth.length - 1 && variation % 2 === 1) degree += 1;
    const octave = variation % 4 === 3 && event.index % 5 === 0 ? 24 : 12;
    const note = scaleNote(this.profile.tonic + octave, degree, this.profile.mode);
    const build = this.currentScene === 5 ? clamp(this.sectionBar / 7, 0, 1) : 0.35;
    const recipe = culture === 'western' && this.currentScene === 5 ? 'acid-resonant' : this.patterns.synthRecipe;
    this.synthSequenceVoice(note, time, BEAT * 0.42, 0.018 * event.accent, event.star?.pan ?? star?.pan ?? 0, recipe, build);
    this.markTrack('synth', time, 0.64, 'synth-sequence', [event.star?.id || star?.id].filter(Boolean));
  }

  scheduleHarmonyLane(step, bar, chordDegree, progressionIndex, time) {
    if (step !== 0 || (bar !== this.sceneStartedBar && bar % 8 !== 0 && !(this.sectionPhase === 'full' && bar === 2))) return;
    const variant = this.laneVariant('harmony');
    const culture = this.profile.cultureId;
    const duration = BEAT * 4 * 8.2;
    let notes = this.profileChord(chordDegree);
    if (culture === 'chinese') {
      const root = scaleNote(this.profile.tonic, chordDegree, this.profile.mode);
      notes = [root, root + 7, root + 12].slice(0, variant === 0 ? 2 : 3);
    } else if (culture === 'indian') notes = [this.profile.tonic - 12, this.profile.tonic, this.profile.tonic + 7];
    this.pad(notes, time, duration, culture === 'indian' ? 0.0135 : culture === 'western' ? 0.0115 : 0.0105 + variant * 0.0004);
    this.markTrack('harmony', time, this.currentSection === 'open' ? 0.82 : 0.58, culture === 'indian' ? 'drone' : 'pad', this.sequence.slice(0, 3).map((star) => star.id));
  }

  scheduleLeadLane(step, bar, chordDegree, time, star) {
    const patternStep = (bar % 4) * GROOVE_STEPS + step;
    const event = this.patterns.lead.find((entry) => entry.step === patternStep);
    if (!event) return;
    const phraseCycle = Math.floor(bar / 4);
    let degree = event.degree + (this.profile.cultureId === 'western' ? chordDegree : 0);
    if (event.index === this.patterns.lead.length - 1 && phraseCycle % 2 === 1) degree += 1;
    const note = scaleNote(this.profile.tonic + 12, degree, this.profile.mode);
    const sourceStar = event.star || star;
    if (this.profile.cultureId === 'indian') this.ornamentLead(note, time, BEAT * 1.7, 0.018, sourceStar?.pan ?? 0);
    else if (event.index % 3 === 0) this.acousticFallback(note, time, BEAT * 1.15, 0.018, sourceStar?.pan ?? 0, this.patterns.acousticSlots[event.index % this.patterns.acousticSlots.length]);
    else this.melodicVoice(note, time, BEAT * 1.5, 0.017, sourceStar?.pan ?? 0);
    this.markTrack('lead', time, 0.76, 'melodic-phrase', [sourceStar?.id].filter(Boolean));
  }

  scheduleTextureLane(step, bar, time, star) {
    const culture = this.profile.cultureId;
    if (step === 0 && bar % 4 === 0 && this.sectionPhase !== 'signature') {
      const note = this.noteForStep(star, bar, culture === 'indian' ? 0 : 12);
      this.sweep(note, time, BEAT * 16, 0.0062, culture === 'chinese' ? 700 : 420, culture === 'western' ? 4400 : 2600, 'sine', (star?.pan ?? 0) * 0.45);
      this.spaceAtmosphere([this.profile.tonic, this.profile.tonic + 7, note], time, BEAT * 20, 0.0038, (star?.pan ?? 0) * 0.3);
      this.markTrack('texture', time, 0.48, 'texture', [star?.id].filter(Boolean));
    }
    const glitchScene = [5, 7, 8, 9].includes(this.currentScene);
    if (step === 15 && bar % (this.currentScene === 9 ? 4 : 8) === (this.currentScene === 9 ? 3 : 7) && glitchScene) {
      this.sampleGlitch(time, culture === 'chinese' ? 0.0045 : 0.0075, star?.pan ?? 0, this.profile.seed + bar * 97);
      this.markTrack('texture', time, 0.56, 'glitch', [star?.id].filter(Boolean));
    }
  }

  scheduleLoopPlayback(stepNumber, time) {
    const session = this.loopSession;
    if (!session?.active) return;
    for (const id of session.completed) {
      const layer = session.layers.get(id);
      if (!layer?.events.length) continue;
      const length = layer.bars * GROOVE_STEPS;
      const origin = session.loopOriginStep ?? layer.anchorStep;
      const relative = ((stepNumber - origin) % length + length) % length;
      layer.events.filter((event) => event.step === relative).forEach((event) => this.playLoopEvent(id, event, time, false));
    }
  }

  playLoopEvent(stageId, event, time, manual = false) {
    const key = event.keyIndex;
    const star = this.sequence[key % Math.max(1, this.sequence.length)] || this.sequence[0];
    const degree = this.degreeForStep(star, key);
    const keyboardRow = key < 10 ? 0 : key < 19 ? 1 : 2;
    if (manual) this.duckForManual(time);
    if (stageId === 'drums') {
      const voice = event.role === 'kick' ? 0 : event.role === 'hat' ? 1 : key % 6;
      if (voice === 0) { this.technoKick(time, 0.1, this.drumPalette().kick); this.markTrack('drums', time, 0.92, 'kick', [star?.id].filter(Boolean)); }
      else if (voice === 1) { this.sampleHat(time, 0.0135, star?.pan ?? 0); this.markTrack('drums', time, 0.48, 'closed-hat', [star?.id].filter(Boolean)); }
      else if (voice === 2) { this.sampleOpenHat(time, 0.014, star?.pan ?? 0); this.markTrack('drums', time, 0.5, 'open-hat', [star?.id].filter(Boolean)); }
      else if (voice === 3) { this.sampleClap(time, 0.013, star?.pan ?? 0); this.markTrack('drums', time, 0.58, 'perc', [star?.id].filter(Boolean)); }
      else if (voice === 4) { this.samplePerc(time, 0.012, star?.pan ?? 0, 1900 + degree * 340); this.markTrack('drums', time, 0.5, 'perc', [star?.id].filter(Boolean)); }
      else { this.sampleGlitch(time, 0.006, star?.pan ?? 0, this.profile.seed + key); this.markTrack('texture', time, 0.52, 'glitch', [star?.id].filter(Boolean)); }
      return;
    }
    const rowOctaves = {
      bass: [0, 12, 0], synth: [12, 24, 0], harmony: [0, 12, -12], lead: [12, 24, 0], texture: [12, 24, 0],
    };
    const baseOctave = stageId === 'bass' ? -12 : 0;
    const note = scaleNote(this.profile.tonic + baseOctave + (rowOctaves[stageId]?.[keyboardRow] || 0), degree, this.profile.mode);
    if (stageId === 'bass') { this.electricBass(note, time, BEAT * 0.65, 0.036); this.markTrack('bass', time, 0.78, 'bass', [star?.id].filter(Boolean)); }
    else if (stageId === 'synth') { this.synthSequenceVoice(note, time, BEAT * 0.42, 0.019, star?.pan ?? 0, this.patterns.synthRecipe, 0.5); this.markTrack('synth', time, 0.68, 'synth-sequence', [star?.id].filter(Boolean)); }
    else if (stageId === 'harmony') { this.pad(this.profileChord(degree), time, BEAT * 2.2, 0.012); this.markTrack('harmony', time, 0.64, this.profile.cultureId === 'indian' ? 'drone' : 'pad', [star?.id].filter(Boolean)); }
    else if (stageId === 'lead') {
      if (this.profile.cultureId === 'indian') this.ornamentLead(note, time, BEAT * 1.3, 0.019, star?.pan ?? 0);
      else this.acousticFallback(note, time, BEAT * 0.9, 0.019, star?.pan ?? 0, this.patterns.acousticSlots[key % this.patterns.acousticSlots.length]);
      this.markTrack('lead', time, 0.76, 'melodic-phrase', [star?.id].filter(Boolean));
    } else if (stageId === 'texture') {
      if (key % 2) this.sampleGlitch(time, 0.005, star?.pan ?? 0, this.profile.seed + key);
      else this.sweep(note, time, BEAT * 2.5, 0.006, 480, 3200, 'sine', star?.pan ?? 0);
      this.markTrack('texture', time, 0.54, key % 2 ? 'glitch' : 'texture', [star?.id].filter(Boolean));
    }
  }

  connectArrangement(node, delayAmount = 0) {
    node.connect(this.arrangementBus);
    if (delayAmount > 0 && this.delay) {
      const send = this.context.createGain();
      send.gain.value = delayAmount;
      node.connect(send).connect(this.delay);
    }
  }

  pump(time, depth = 0.36) {
    if (!this.arrangementBus) return;
    const gain = this.arrangementBus.gain;
    gain.setValueAtTime(depth, time);
    gain.exponentialRampToValueAtTime(ARRANGEMENT_GAIN, time + BEAT * 0.58);
  }

  sampleHat(time, gain = 0.012, pan = 0, route = 'arrangement') {
    if (this.voices >= MAX_VOICES) return;
    const source = this.context.createBufferSource();
    const highpass = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    const panner = this.context.createStereoPanner();
    source.buffer = this.noiseBuffer;
    highpass.type = 'highpass'; highpass.frequency.value = 6200; highpass.Q.value = 0.7;
    envelope.gain.setValueAtTime(gain, time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    panner.pan.value = clamp(pan, -0.75, 0.75);
    source.connect(highpass).connect(envelope).connect(panner);
    if (route === 'gesture') panner.connect(this.gestureBus); else this.connectArrangement(panner, 0.04);
    this.register(source);
    source.start(time, unitNoise(time * 37) * 2.6, 0.055); source.stop(time + 0.06);
  }

  sampleOpenHat(time, gain = 0.014, pan = 0) {
    if (this.voices >= MAX_VOICES) return;
    const source = this.context.createBufferSource();
    const highpass = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    const panner = this.context.createStereoPanner();
    source.buffer = this.noiseBuffer;
    highpass.type = 'highpass'; highpass.frequency.value = 5400; highpass.Q.value = 0.5;
    envelope.gain.setValueAtTime(gain, time);
    envelope.gain.exponentialRampToValueAtTime(gain * 0.34, time + 0.08);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
    panner.pan.value = clamp(pan, -0.75, 0.75);
    source.connect(highpass).connect(envelope).connect(panner);
    this.connectArrangement(panner, 0.08);
    this.register(source);
    source.start(time, unitNoise(time * 43) * 2.5, 0.26); source.stop(time + 0.27);
  }

  samplePerc(time, gain = 0.012, pan = 0, frequency = 2400) {
    if (this.voices >= MAX_VOICES) return;
    const oscillator = this.context.createOscillator();
    const band = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    const panner = this.context.createStereoPanner();
    oscillator.type = frequency > 3500 ? 'square' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(180, frequency * 0.44), time + 0.065);
    band.type = 'bandpass'; band.frequency.value = frequency; band.Q.value = 6;
    envelope.gain.setValueAtTime(gain, time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.085);
    panner.pan.value = clamp(pan, -0.8, 0.8);
    oscillator.connect(band).connect(envelope).connect(panner);
    this.connectArrangement(panner, 0.1);
    this.register(oscillator); oscillator.start(time); oscillator.stop(time + 0.1);
  }

  sampleClap(time, gain = 0.014, pan = 0) {
    for (let hit = 0; hit < 3; hit += 1) {
      const when = time + hit * 0.012;
      const source = this.context.createBufferSource();
      const band = this.context.createBiquadFilter();
      const envelope = this.context.createGain();
      const panner = this.context.createStereoPanner();
      source.buffer = this.noiseBuffer;
      band.type = 'bandpass'; band.frequency.value = 1550 + hit * 420; band.Q.value = 0.9;
      envelope.gain.setValueAtTime(gain * (1 - hit * 0.22), when);
      envelope.gain.exponentialRampToValueAtTime(0.0001, when + 0.075 + hit * 0.018);
      panner.pan.value = clamp(pan + (hit - 1) * 0.08, -0.8, 0.8);
      source.connect(band).connect(envelope).connect(panner);
      this.connectArrangement(panner, 0.16);
      this.register(source);
      source.start(when, unitNoise(when * 71 + hit) * 2.7, 0.13); source.stop(when + 0.14);
    }
  }

  sampleGlitch(time, gain, pan, seed) {
    for (let slice = 0; slice < 4; slice += 1) {
      const source = this.context.createBufferSource();
      const band = this.context.createBiquadFilter();
      const envelope = this.context.createGain();
      const panner = this.context.createStereoPanner();
      const spread = unitNoise(seed + slice * 11);
      const when = time + slice * (BEAT / 16);
      source.buffer = this.noiseBuffer;
      source.playbackRate.value = 0.7 + spread * 1.9;
      band.type = 'bandpass'; band.frequency.value = 900 + spread * 6200; band.Q.value = 8 + spread * 9;
      envelope.gain.setValueAtTime(Math.max(0.0002, gain * (1 - slice * 0.16)), when);
      envelope.gain.exponentialRampToValueAtTime(0.0001, when + 0.028 + spread * 0.018);
      panner.pan.value = clamp(pan * (slice % 2 ? -1 : 1), -0.85, 0.85);
      source.connect(band).connect(envelope).connect(panner);
      this.connectArrangement(panner, 0.24);
      this.register(source);
      source.start(when, spread * 2.7, 0.06); source.stop(when + 0.065);
    }
  }

  electricBass(note, time, duration, gain) {
    if (this.voices >= MAX_VOICES - 1) return;
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    filter.type = 'lowpass'; filter.Q.value = 4.2;
    filter.frequency.setValueAtTime(760, time);
    filter.frequency.exponentialRampToValueAtTime(180, time + duration);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(gain, time + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    const bassStacks = [
      [['sawtooth', -4, 0.38], ['sine', 0, 0.72]],
      [['triangle', -7, 0.48], ['sine', 2, 0.66]],
      [['square', -3, 0.2], ['sine', 0, 0.78]],
      [['sawtooth', -9, 0.28], ['triangle', 6, 0.62]],
    ];
    for (const [type, detune, level] of bassStacks[this.profile.timbre]) {
      const oscillator = this.context.createOscillator();
      const partial = this.context.createGain();
      oscillator.type = type; oscillator.frequency.value = midi(note); oscillator.detune.value = detune;
      partial.gain.value = level;
      oscillator.connect(partial).connect(filter);
      this.register(oscillator);
      oscillator.start(time); oscillator.stop(time + duration + 0.04);
    }
    filter.connect(envelope);
    this.connectArrangement(envelope);
  }

  arp(note, time, duration, gain, pan) {
    if (this.voices >= MAX_VOICES - 1) return;
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    const panner = this.context.createStereoPanner();
    filter.type = 'lowpass'; filter.Q.value = 3.2;
    filter.frequency.setValueAtTime(1100 + (note % 12) * 105, time);
    filter.frequency.exponentialRampToValueAtTime(3100 + (note % 7) * 180, time + duration * 0.42);
    filter.frequency.exponentialRampToValueAtTime(780, time + duration);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(gain, time + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    panner.pan.value = clamp(pan, -0.78, 0.78);
    const arpStacks = [
      [['sawtooth', -7, 0.34], ['triangle', 5, 0.72]],
      [['square', -5, 0.2], ['sine', 7, 0.76]],
      [['triangle', -9, 0.48], ['sine', 4, 0.58]],
      [['sawtooth', -12, 0.24], ['square', 8, 0.3]],
    ];
    arpStacks[this.profile.timbre].forEach(([type, detune, level]) => {
      const oscillator = this.context.createOscillator();
      const partial = this.context.createGain();
      oscillator.type = type; oscillator.frequency.value = midi(note); oscillator.detune.value = detune;
      partial.gain.value = level;
      oscillator.connect(partial).connect(filter);
      this.register(oscillator);
      oscillator.start(time); oscillator.stop(time + duration + 0.04);
    });
    filter.connect(envelope).connect(panner);
    this.connectArrangement(panner, 0.38);
  }

  synthSequenceVoice(note, time, duration, gain, pan, recipe = 'analog-pluck', evolution = 0.35) {
    if (this.voices >= MAX_VOICES - 2) return;
    const recipes = {
      'analog-pluck': { oscillators: [['sawtooth', -8, 0.34], ['triangle', 6, 0.7]], start: 4200, end: 620, q: 5.2, attack: 0.005, delay: 0.24 },
      'saw-sequence': { oscillators: [['sawtooth', -10, 0.46], ['sawtooth', 9, 0.38]], start: 5200, end: 760, q: 4.1, attack: 0.004, delay: 0.3 },
      'acid-resonant': { oscillators: [['sawtooth', -4, 0.62], ['square', 7, 0.18]], start: 2400, end: 430, q: 14, attack: 0.003, delay: 0.34 },
      'soft-poly': { oscillators: [['triangle', -6, 0.54], ['sine', 7, 0.52]], start: 2600, end: 880, q: 2.4, attack: 0.02, delay: 0.4 },
      'dark-pulse': { oscillators: [['square', -7, 0.22], ['triangle', 5, 0.68]], start: 1750, end: 390, q: 7.2, attack: 0.008, delay: 0.42 },
      'fm-metallic': { oscillators: [['sine', 0, 0.58], ['sine', 1200, 0.22], ['triangle', -11, 0.32]], start: 6500, end: 980, q: 8.5, attack: 0.002, delay: 0.46 },
    };
    const config = recipes[recipe] || recipes['analog-pluck'];
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    const panner = this.context.createStereoPanner();
    filter.type = 'lowpass'; filter.Q.value = config.q;
    filter.frequency.setValueAtTime(Math.max(220, config.start * (0.55 + evolution * 0.75)), time);
    filter.frequency.exponentialRampToValueAtTime(config.end, time + duration);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(gain, time + config.attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    panner.pan.value = clamp(pan * 0.68, -0.82, 0.82);
    config.oscillators.forEach(([type, detune, level], index) => {
      const oscillator = this.context.createOscillator();
      const partial = this.context.createGain();
      oscillator.type = type; oscillator.frequency.value = midi(note); oscillator.detune.value = detune;
      partial.gain.value = level;
      if (recipe === 'fm-metallic' && index === 1) oscillator.frequency.value = midi(note) * 2.01;
      oscillator.connect(partial).connect(filter);
      this.register(oscillator); oscillator.start(time); oscillator.stop(time + duration + 0.04);
    });
    filter.connect(envelope).connect(panner);
    this.connectArrangement(panner, config.delay);
  }

  acousticFallback(note, time, duration, gain, pan, slot = 'stellar') {
    const metallic = /guzheng|pipa|harpsichord|harp|metal/i.test(slot);
    const airy = /dizi|flute|strings|drone/i.test(slot);
    if (airy) {
      this.sweep(note, time, duration * 1.45, gain * 0.72, 680, /dizi/i.test(slot) ? 2800 : 1900, 'triangle', pan);
      return;
    }
    this.synthSequenceVoice(note, time, duration, gain, pan, metallic ? 'fm-metallic' : 'analog-pluck', 0.4);
    if (/metal/i.test(slot)) this.samplePerc(time, gain * 0.38, pan, midi(note) * 2.3);
  }

  pad(notes, time, duration, gain) {
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    filter.type = 'lowpass'; filter.Q.value = 1.15;
    filter.frequency.setValueAtTime(360, time);
    filter.frequency.exponentialRampToValueAtTime(1850, time + duration * 0.48);
    filter.frequency.exponentialRampToValueAtTime(310, time + duration);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(gain, time + Math.min(BEAT * 2.6, duration * 0.32));
    envelope.gain.setValueAtTime(gain * 0.88, time + duration * 0.66);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    notes.forEach((note, index) => {
      if (this.voices >= MAX_VOICES) return;
      const oscillator = this.context.createOscillator();
      const partial = this.context.createGain();
      const padTypes = [
        ['sine', 'triangle'], ['triangle', 'sine'], ['sine', 'sine'], ['triangle', 'sawtooth'],
      ];
      oscillator.type = padTypes[this.profile.timbre][index % 2];
      oscillator.frequency.value = midi(note); oscillator.detune.value = (index - 1.5) * 6;
      partial.gain.value = index === 1 ? 0.64 : 0.42;
      oscillator.connect(partial).connect(filter);
      this.register(oscillator);
      oscillator.start(time); oscillator.stop(time + duration + 0.08);
    });
    filter.connect(envelope);
    this.connectArrangement(envelope, 0.2);

    // A filtered procedural-air layer gives the sustained chord a physical texture.
    if (this.voices < MAX_VOICES) {
      const air = this.context.createBufferSource();
      const airFilter = this.context.createBiquadFilter();
      const airGain = this.context.createGain();
      air.buffer = this.noiseBuffer; air.loop = true;
      airFilter.type = 'bandpass'; airFilter.Q.value = 0.65;
      airFilter.frequency.setValueAtTime(520, time);
      airFilter.frequency.exponentialRampToValueAtTime(1700, time + duration * 0.5);
      airFilter.frequency.exponentialRampToValueAtTime(430, time + duration);
      airGain.gain.setValueAtTime(0.0001, time);
      airGain.gain.exponentialRampToValueAtTime(gain * 0.22, time + BEAT * 3);
      airGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      air.connect(airFilter).connect(airGain);
      this.connectArrangement(airGain, 0.16);
      this.register(air);
      air.start(time, unitNoise(time * 17) * 2); air.stop(time + duration + 0.05);
    }
  }

  spaceAtmosphere(notes, time, duration, gain = 0.004, pan = 0) {
    if (!this.context || this.voices >= MAX_VOICES - 6 || !this.bedBus) return;
    const grammar = this.profile.grammar;
    const bedNotes = [...new Set(notes.slice(0, 3))];
    const voices = bedNotes.flatMap((note, index) => {
      const octave = index === 0 ? -12 : 0;
      const spread = grammar.voicing === 'open-pentatonic' ? 4 : 7;
      return [
        { note: note + octave, type: 'sine', detune: -spread, pan: -0.48 + pan * 0.24, level: index === 0 ? 0.17 : 0.13 },
        { note: note + octave + (index === 0 ? 12 : 0), type: 'triangle', detune: spread, pan: 0.48 + pan * 0.24, level: index === 0 ? 0.11 : 0.1 },
      ];
    }).slice(0, 6);
    voices.forEach((voice, index) => {
      if (this.voices >= MAX_VOICES) return;
      const oscillator = this.context.createOscillator();
      const highpass = this.context.createBiquadFilter();
      const lowpass = this.context.createBiquadFilter();
      const envelope = this.context.createGain();
      const panner = this.context.createStereoPanner();
      oscillator.type = voice.type;
      oscillator.frequency.value = midi(voice.note);
      oscillator.detune.setValueAtTime(voice.detune, time);
      oscillator.detune.linearRampToValueAtTime(-voice.detune * 0.7, time + duration);
      highpass.type = 'highpass'; highpass.frequency.value = index < 2 ? 58 : 110;
      lowpass.type = 'lowpass'; lowpass.Q.value = 0.38;
      lowpass.frequency.setValueAtTime(520 + index * 90, time);
      lowpass.frequency.linearRampToValueAtTime(1100 + this.profile.timbre * 130, time + duration * 0.46);
      lowpass.frequency.linearRampToValueAtTime(620, time + duration);
      envelope.gain.setValueAtTime(0.0001, time);
      envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * voice.level), time + BEAT * (3.2 + index * 0.18));
      envelope.gain.setValueAtTime(Math.max(0.0002, gain * voice.level * 0.72), time + duration * 0.68);
      envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      panner.pan.setValueAtTime(clamp(voice.pan, -0.72, 0.72), time);
      panner.pan.linearRampToValueAtTime(clamp(-voice.pan * 0.62, -0.72, 0.72), time + duration);
      oscillator.connect(highpass).connect(lowpass).connect(envelope).connect(panner);
      this.connectBed(panner, 0.24);
      this.register(oscillator); oscillator.start(time); oscillator.stop(time + duration + 0.12);
    });
    if (this.voices < MAX_VOICES) {
      const air = this.context.createBufferSource();
      const highpass = this.context.createBiquadFilter();
      const lowpass = this.context.createBiquadFilter();
      const airGain = this.context.createGain();
      const panner = this.context.createStereoPanner();
      air.buffer = this.noiseBuffer; air.loop = true;
      highpass.type = 'highpass'; highpass.frequency.value = 1100;
      lowpass.type = 'lowpass'; lowpass.frequency.value = 5200;
      airGain.gain.setValueAtTime(0.0001, time);
      airGain.gain.exponentialRampToValueAtTime(gain * 0.045, time + BEAT * 4);
      airGain.gain.setValueAtTime(gain * 0.035, time + duration * 0.72);
      airGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      panner.pan.setValueAtTime(-0.32, time); panner.pan.linearRampToValueAtTime(0.32, time + duration);
      air.connect(highpass).connect(lowpass).connect(airGain).connect(panner);
      this.connectBed(panner, 0.32);
      this.register(air); air.start(time, unitNoise(this.profile.seed + time * 13) * 2); air.stop(time + duration + 0.12);
    }
  }

  melodicVoice(note, time, duration, gain, pan = 0) {
    if (this.voices >= MAX_VOICES - 1) return;
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    const panner = this.context.createStereoPanner();
    filter.type = 'lowpass'; filter.Q.value = 4.6;
    filter.frequency.setValueAtTime(720, time);
    filter.frequency.exponentialRampToValueAtTime(3800, time + duration * 0.28);
    filter.frequency.exponentialRampToValueAtTime(620, time + duration);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(gain, time + 0.035);
    envelope.gain.setValueAtTime(gain * 0.68, time + duration * 0.45);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    panner.pan.setValueAtTime(clamp(pan * 0.55, -0.62, 0.62), time);
    panner.pan.linearRampToValueAtTime(clamp(-pan * 0.4, -0.55, 0.55), time + duration);
    const leadStacks = [
      [['sawtooth', -9, 0.26], ['triangle', 7, 0.74]],
      [['triangle', -5, 0.52], ['sine', 9, 0.54]],
      [['square', -7, 0.16], ['sine', 4, 0.78]],
      [['sawtooth', -12, 0.2], ['triangle', 11, 0.68]],
    ];
    leadStacks[this.profile.timbre].forEach(([type, detune, level]) => {
      const oscillator = this.context.createOscillator();
      const partial = this.context.createGain();
      oscillator.type = type; oscillator.frequency.value = midi(note); oscillator.detune.value = detune;
      partial.gain.value = level;
      oscillator.connect(partial).connect(filter);
      this.register(oscillator);
      oscillator.start(time); oscillator.stop(time + duration + 0.05);
    });
    filter.connect(envelope).connect(panner);
    this.connectArrangement(panner, 0.5);
  }

  ornamentLead(note, time, duration, gain, pan = 0) {
    if (this.voices >= MAX_VOICES) return;
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    const panner = this.context.createStereoPanner();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(midi(note - 1), time);
    oscillator.frequency.exponentialRampToValueAtTime(midi(note), time + Math.min(0.11, duration * 0.18));
    oscillator.frequency.setValueAtTime(midi(note), time + duration * 0.56);
    oscillator.frequency.exponentialRampToValueAtTime(midi(note + 1), time + duration * 0.68);
    oscillator.frequency.exponentialRampToValueAtTime(midi(note), time + duration * 0.82);
    filter.type = 'lowpass'; filter.Q.value = 3.8;
    filter.frequency.setValueAtTime(980, time);
    filter.frequency.exponentialRampToValueAtTime(3300, time + duration * 0.38);
    filter.frequency.exponentialRampToValueAtTime(720, time + duration);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(gain, time + 0.035);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    panner.pan.value = clamp(pan, -0.7, 0.7);
    oscillator.connect(filter).connect(envelope).connect(panner);
    this.connectArrangement(panner, 0.46);
    this.register(oscillator); oscillator.start(time); oscillator.stop(time + duration + 0.05);
  }

  technoKick(time, gain = 0.11, variant = 0, route = 'arrangement') {
    if (this.voices >= MAX_VOICES - 2) return;
    const recipes = [
      { start: 190, end: 42, pitchDecay: 0.055, decay: 0.27, punch: 0.68, click: 0.24 },
      { start: 248, end: 51, pitchDecay: 0.035, decay: 0.19, punch: 0.86, click: 0.34 },
      { start: 168, end: 37, pitchDecay: 0.072, decay: 0.42, punch: 0.52, click: 0.16 },
      { start: 224, end: 53, pitchDecay: 0.028, decay: 0.145, punch: 0.74, click: 0.3 },
      { start: 176, end: 48, pitchDecay: 0.045, decay: 0.12, punch: 0.38, click: 0.1 },
    ];
    const recipe = recipes[variant % recipes.length];
    const bodyEnvelope = this.context.createGain();
    bodyEnvelope.gain.setValueAtTime(gain * (variant === 4 ? 0.68 : 1), time);
    bodyEnvelope.gain.exponentialRampToValueAtTime(gain * 0.34, time + 0.075);
    bodyEnvelope.gain.exponentialRampToValueAtTime(0.0001, time + recipe.decay);
    const body = this.context.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(recipe.start, time);
    body.frequency.exponentialRampToValueAtTime(recipe.end + 6, time + recipe.pitchDecay);
    body.frequency.exponentialRampToValueAtTime(recipe.end, time + recipe.decay * 0.8);
    body.connect(bodyEnvelope);
    if (route === 'gesture') bodyEnvelope.connect(this.gestureBus); else bodyEnvelope.connect(this.arrangementBus);
    this.register(body); body.start(time); body.stop(time + recipe.decay + 0.03);

    const punch = this.context.createOscillator();
    const punchFilter = this.context.createBiquadFilter();
    const punchEnvelope = this.context.createGain();
    punch.type = 'triangle'; punch.frequency.setValueAtTime(118, time);
    punch.frequency.exponentialRampToValueAtTime(55, time + 0.07);
    punchFilter.type = 'lowpass'; punchFilter.frequency.value = 260; punchFilter.Q.value = 1.8;
    punchEnvelope.gain.setValueAtTime(gain * recipe.punch, time);
    punchEnvelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.115);
    punch.connect(punchFilter).connect(punchEnvelope);
    if (route === 'gesture') punchEnvelope.connect(this.gestureBus); else punchEnvelope.connect(this.arrangementBus);
    this.register(punch); punch.start(time); punch.stop(time + 0.13);

    const click = this.context.createBufferSource();
    const clickFilter = this.context.createBiquadFilter();
    const clickEnvelope = this.context.createGain();
    click.buffer = this.noiseBuffer;
    clickFilter.type = 'bandpass'; clickFilter.frequency.value = 3400; clickFilter.Q.value = 1.25;
    clickEnvelope.gain.setValueAtTime(gain * recipe.click, time);
    clickEnvelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.018);
    click.connect(clickFilter).connect(clickEnvelope);
    if (route === 'gesture') clickEnvelope.connect(this.gestureBus); else clickEnvelope.connect(this.arrangementBus);
    this.register(click); click.start(time, unitNoise(time * 313) * 2.8, 0.025); click.stop(time + 0.027);
  }

  register(source) {
    this.active.add(source);
    this.voices += 1;
    source.addEventListener('ended', () => {
      this.active.delete(source);
      this.voices = Math.max(0, this.voices - 1);
    }, { once: true });
  }

  tone(note, time, duration, gain, type = 'triangle', cutoff = 2400, pan = 0) {
    if (this.voices >= MAX_VOICES) return;
    const ac = this.context;
    const oscillator = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const envelope = ac.createGain();
    const panner = ac.createStereoPanner();
    oscillator.type = type;
    oscillator.frequency.value = midi(note);
    filter.type = 'lowpass'; filter.frequency.value = cutoff; filter.Q.value = 1.7;
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + 0.007);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    panner.pan.value = pan;
    oscillator.connect(filter).connect(envelope).connect(panner).connect(this.master);
    this.register(oscillator);
    oscillator.start(time); oscillator.stop(time + duration + 0.04);
  }

  sweep(note, time, duration, gain, startCut, endCut, type = 'sawtooth', pan = 0) {
    if (this.voices >= MAX_VOICES) return;
    const ac = this.context;
    const oscillator = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const envelope = ac.createGain();
    const panner = ac.createStereoPanner();
    oscillator.type = type; oscillator.frequency.value = midi(note);
    filter.type = 'bandpass'; filter.Q.value = 4.8;
    filter.frequency.setValueAtTime(Math.max(100, startCut), time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(100, endCut), time + duration * 0.92);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(gain, time + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    panner.pan.setValueAtTime(pan, time); panner.pan.linearRampToValueAtTime(-pan, time + duration);
    oscillator.connect(filter).connect(envelope).connect(panner).connect(this.master);
    this.register(oscillator);
    oscillator.start(time); oscillator.stop(time + duration + 0.04);
  }

  noiseHit(time, duration, gain, frequency = 5000, q = 2, pan = 0) {
    if (this.voices >= MAX_VOICES) return;
    const ac = this.context;
    const source = ac.createBufferSource();
    const filter = ac.createBiquadFilter();
    const envelope = ac.createGain();
    const panner = ac.createStereoPanner();
    source.buffer = this.noiseBuffer;
    filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = q;
    envelope.gain.setValueAtTime(Math.max(0.0002, gain), time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    panner.pan.value = pan;
    source.connect(filter).connect(envelope).connect(panner).connect(this.master);
    this.register(source);
    source.start(time); source.stop(time + duration + 0.03);
  }

  kick(time, gain = 0.08, destination = this.master) {
    if (this.voices >= MAX_VOICES) return;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.frequency.setValueAtTime(160, time);
    oscillator.frequency.exponentialRampToValueAtTime(43, time + 0.11);
    envelope.gain.setValueAtTime(gain, time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    oscillator.connect(envelope).connect(destination);
    this.register(oscillator);
    oscillator.start(time); oscillator.stop(time + 0.18);
  }
}
