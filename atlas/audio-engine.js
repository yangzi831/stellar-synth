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
const LOOK_AHEAD = 0.13;
const MAX_VOICES = 84;
const MAX_INTERACTIONS = 8;
const MASTER_GAIN = 0.95;
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
const SECTION_NAMES = ['intro', 'groove', 'build', 'open', 'motif', 'break', 'return', 'tail'];
const SECTION_TRACKS = {
  intro: ['harmony', 'texture'],
  groove: ['drums', 'bass', 'texture'],
  build: ['drums', 'bass', 'synth', 'texture'],
  open: ['drums', 'bass', 'synth', 'harmony', 'texture'],
  motif: ['drums', 'bass', 'synth', 'harmony', 'lead', 'texture'],
  break: ['harmony', 'lead', 'texture'],
  return: TRACK_IDS,
  tail: ['harmony', 'texture'],
};
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
    this.compressor = null;
    this.limiter = null;
    this.noiseBuffer = null;
    this.gestureBus = null;
    this.reverbSend = null;
    this.reverb = null;
    this.reverbReturn = null;
    this.arrangementBus = null;
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
    this.sectionBar = 0;
    this.formBar = 0;
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
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 9;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.2;
    this.limiter = ac.createDynamicsCompressor();
    this.limiter.threshold.value = -2;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.09;
    this.master.connect(this.compressor).connect(this.limiter).connect(ac.destination);
    this.noiseBuffer = this.makeNoise();
    this.gestureBus = ac.createGain();
    this.gestureBus.gain.value = 0.92;
    this.gestureBus.connect(this.master);
    this.reverbSend = ac.createGain();
    this.reverbSend.gain.value = 0.26;
    this.reverb = ac.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.8);
    this.reverbReturn = ac.createGain();
    this.reverbReturn.gain.value = 0.38;
    this.reverbSend.connect(this.reverb).connect(this.reverbReturn).connect(this.master);
    this.arrangementBus = ac.createGain();
    this.arrangementBus.gain.value = 0.68;
    this.arrangementBus.connect(this.master);
    this.arrangementBus.connect(this.reverbSend);
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
    this.createTrackLanes();
    this.currentSection = 'intro';
    this.sectionBar = 0;
    this.formBar = 0;
    this.tick = 0;
    this.eventTick = 0;
    this.arrangementStep = 0;
    if (this.running && this.context) this.nextArrangementTick = this.context.currentTime + 0.035;
    if (this.delay) {
      const ratios = [0.5, 0.75, 1, 1.25];
      this.delay.delayTime.setTargetAtTime(BEAT * ratios[this.profile.timbre], this.context.currentTime, 0.04);
    }
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
    const activeTracks = SECTION_TRACKS[this.currentSection] || [];
    return {
      ...clock, barPhase: ((this.arrangementStep % this.profile.meterSteps) / this.profile.meterSteps),
      overallEnergy: clamp(activeTracks.length / TRACK_IDS.length + (this.currentSection === 'build' ? 0.18 : 0), 0.08, 1),
      kickEnvelope: envelopes.drums, percEnvelope: envelopes.drums * 0.7,
      bassEnvelope: envelopes.bass, synthEnvelope: envelopes.synth,
      padEnvelope: envelopes.harmony, textureEnvelope: envelopes.texture,
      leadEnvelope: envelopes.lead, currentSection: this.currentSection,
      currentCulture: this.profile.cultureId, currentArrangementMode: this.arrangementMode,
      particleMotion: (this.profile.grammar.arrangement || FALLBACK_CULTURE_PROFILE.arrangement).particleMotion,
      activeTracks, manualOverrides: [...this.trackLanes.values()].filter((lane) => lane.manualOverride).map((lane) => lane.id),
      tracks: this.trackSnapshot(),
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
    this.arrangementStep = 0;
    this.timer = window.setInterval(() => this.schedule(), 18);
    this.dispatchEvent(new CustomEvent('state', { detail: { running: true } }));
  }

  stop() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    this.running = false;
    this.releaseAll(false);
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
        this.triggerStarEvent(event, eventIndex, this.nextTick);
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
    for (const id of [...this.interactions.keys()]) this.release(id, immediate);
  }

  connectGesture(node) {
    node.connect(this.gestureBus);
    node.connect(this.reverbSend);
  }

  starInstrumentAttack(step, index, time) {
    const magnitude = Number.isFinite(step.mag) ? step.mag : 4;
    const velocity = clamp(1.05 - (magnitude + 1.3) / 8.5, 0.25, 0.9);
    const note = this.noteForStep(step, index, 12);
    const pan = clamp((step.pan ?? 0) * 0.82, -0.88, 0.88);
    const instrument = Math.abs((Number(step.id) || index) + index * 3 + this.profile.seed) % 5;
    if (instrument === 0) this.gestureInstrumentTone(note, time, 0.82, 0.036 * velocity, pan, 'bell');
    else if (instrument === 1) this.gestureInstrumentTone(note, time, 0.48, 0.044 * velocity, pan, 'keys');
    else if (instrument === 2) this.gestureInstrumentTone(note, time, 0.38, 0.035 * velocity, pan, 'synth');
    else if (instrument === 3) this.gestureInstrumentTone(note - 12, time, 0.55, 0.05 * velocity, pan, 'bass');
    else this.gestureMallet(note, time, 0.04 * velocity, pan, index + this.profile.seed);
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

  triggerStep(step, index, time, emphatic) {
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
      this.kick(time, 0.035 + velocity * 0.035);
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
        this.triggerStep(step, index, when, false);
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
    const profile = this.profile;
    const cycleStep = stepNumber % profile.meterSteps;
    const cycleIndex = Math.floor(stepNumber / profile.meterSteps);
    this.updateArrangementDirector(stepNumber, time);
    const progressionIndex = cycleIndex % profile.progression.length;
    const chordDegree = profile.progression[progressionIndex];
    const sourceStep = this.sequence[stepNumber % this.sequence.length];
    const nextStep = this.sequence[(stepNumber * 3 + 1) % this.sequence.length] || sourceStep;
    if (this.trackIsActive('drums')) this.scheduleDrumLane(cycleStep, cycleIndex, time, sourceStep, nextStep);
    if (this.trackIsActive('bass')) this.scheduleBassLane(cycleStep, cycleIndex, chordDegree, time, sourceStep);
    if (this.trackIsActive('synth')) this.scheduleSynthLane(cycleStep, cycleIndex, chordDegree, time, nextStep);
    if (this.trackIsActive('harmony')) this.scheduleHarmonyLane(cycleStep, cycleIndex, chordDegree, progressionIndex, time);
    if (this.trackIsActive('lead')) this.scheduleLeadLane(cycleStep, cycleIndex, chordDegree, time, sourceStep);
    if (this.trackIsActive('texture')) this.scheduleTextureLane(cycleStep, cycleIndex, time, nextStep);
  }

  updateArrangementDirector(stepNumber, time) {
    const meter = this.profile.meterSteps;
    const bar = Math.floor(stepNumber / meter);
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
    if (stepNumber % meter !== 0) return;
    const arrangement = this.profile.grammar.arrangement || FALLBACK_CULTURE_PROFILE.arrangement;
    const totalBars = arrangement.sectionBars.reduce((sum, value) => sum + value, 0);
    const formPosition = bar % totalBars;
    let cursor = 0; let sectionIndex = 0;
    for (; sectionIndex < arrangement.sectionBars.length; sectionIndex += 1) {
      if (formPosition < cursor + arrangement.sectionBars[sectionIndex]) break;
      cursor += arrangement.sectionBars[sectionIndex];
    }
    const nextSection = SECTION_NAMES[Math.min(sectionIndex, SECTION_NAMES.length - 1)];
    const changed = nextSection !== this.currentSection || bar === 0;
    this.currentSection = nextSection;
    this.sectionBar = formPosition - cursor;
    if (changed || bar % 4 === 0) {
      for (const [laneIndex, lane] of [...this.trackLanes.values()].entries()) {
        if (lane.manualOverride) continue;
        const next = Math.floor(unitNoise(this.profile.seed + bar * 31 + laneIndex * 83) * lane.variants.length);
        lane.current = next;
      }
    }
    this.dispatchArrangementState();
  }

  trackIsActive(trackId) {
    const lane = this.trackLanes.get(trackId);
    return Boolean(lane?.manualOverride || SECTION_TRACKS[this.currentSection]?.includes(trackId));
  }

  laneVariant(trackId) { return this.trackLanes.get(trackId)?.current || 0; }

  scheduleDrumLane(step, bar, time, sourceStep, nextStep) {
    const meter = this.profile.meterSteps;
    const variant = this.laneVariant('drums');
    const culture = this.profile.cultureId;
    let kicks;
    if (culture === 'western') kicks = Array.from({ length: Math.ceil(meter / 4) }, (_, index) => index * 4).filter((value) => value < meter);
    else if (culture === 'chinese') kicks = variant === 1 ? [0, Math.floor(meter * 0.58), meter - 2] : [0, Math.floor(meter * 0.54)];
    else if (culture === 'indian') kicks = [0, Math.floor(meter * 0.38), Math.floor(meter * 0.72)];
    else kicks = [[0, Math.floor(meter * 0.58)], [0, 4, 8, 12], [0, Math.floor(meter * 0.34), Math.floor(meter * 0.7)], [0, 3, Math.floor(meter / 2), meter - 2]][variant % 4];
    kicks = [...new Set(kicks.filter((value) => value >= 0 && value < meter))];
    if (variant === 4) kicks = kicks.filter((_, index) => index % 2 === 0);
    if (kicks.includes(step)) {
      this.technoKick(time, step === 0 ? 0.136 : 0.108, variant);
      this.pump(time, step === 0 ? 0.34 : 0.43);
      this.markTrack('drums', time, step === 0 ? 1 : 0.76, 'kick', [sourceStep?.id].filter(Boolean));
    }
    const hatDivisor = culture === 'chinese' ? 6 : culture === 'indian' ? 3 : 4;
    if ((step + variant) % hatDivisor === 2 && this.currentSection !== 'intro') {
      this.sampleHat(time, 0.008 + variant * 0.0007, (nextStep?.pan ?? 0) * 0.45);
      this.markTrack('drums', time, 0.42, 'perc', [nextStep?.id].filter(Boolean));
    }
    const cyclicAccent = culture === 'indian' ? [Math.floor(meter * 0.25), Math.floor(meter * 0.62)] : [Math.floor(meter / 2)];
    if (cyclicAccent.includes(step) && variant % 2 === 1) {
      this.sampleClap(time, culture === 'chinese' ? 0.006 : 0.01, sourceStep?.pan ?? 0);
      this.markTrack('drums', time, 0.58, 'perc', [sourceStep?.id].filter(Boolean));
    }
  }

  scheduleBassLane(step, bar, chordDegree, time, sourceStep) {
    const meter = this.profile.meterSteps;
    const variant = this.laneVariant('bass');
    const culture = this.profile.cultureId;
    const gates = culture === 'western'
      ? [[0, 8], [2, 6, 10, 14], [0, 3, 7, 11], [0, meter - 2]][variant]
      : culture === 'indian' ? [[0], [0, Math.floor(meter / 2)], [0, 6, 10], [0, meter - 1]][variant]
        : [[0], [0, Math.floor(meter * 0.58)], [0, 4, 9], [0, meter - 2]][variant];
    if (!gates.filter((value) => value < meter).includes(step)) return;
    let degree;
    if (culture === 'chinese') degree = [0, 4, 0, 0][(bar + variant) % 4];
    else if (culture === 'indian') degree = (bar + variant) % 3 === 1 ? 4 : 0;
    else degree = chordDegree + ([0, 0, 2, 4][variant] || 0);
    const note = scaleNote(this.profile.tonic - 12, degree, this.profile.mode);
    this.electricBass(note, time, BEAT * (variant === 0 ? 1.15 : 0.58), culture === 'indian' ? 0.026 : 0.03);
    this.markTrack('bass', time, 0.78, 'bass', [sourceStep?.id].filter(Boolean));
  }

  scheduleSynthLane(step, bar, chordDegree, time, star) {
    const variant = this.laneVariant('synth');
    const culture = this.profile.cultureId;
    const stride = culture === 'chinese' ? [6, 4, 5, 3][variant] : culture === 'indian' ? [5, 4, 6, 3][variant] : [4, 3, 2, 4][variant];
    if ((step + 1 + variant) % stride !== 0) return;
    const starDegree = this.degreeForStep(star, bar + step);
    const offset = culture === 'western' ? [0, 2, 4, 6][(step + variant) % 4]
      : culture === 'indian' ? [0, 1, 4, 1][(step + variant) % 4] : [0, 3, 4, 1][(step + variant) % 4];
    const note = scaleNote(this.profile.tonic + 12, chordDegree + starDegree + offset, this.profile.mode);
    if (culture === 'indian' && variant === 3) this.ornamentLead(note, time, BEAT * 0.72, 0.012, star?.pan ?? 0);
    else this.arp(note, time, BEAT * (0.46 + variant * 0.08), culture === 'chinese' ? 0.012 : 0.014, (star?.pan ?? 0) * 0.65);
    this.markTrack('synth', time, 0.62, 'synth', [star?.id].filter(Boolean));
  }

  scheduleHarmonyLane(step, bar, chordDegree, progressionIndex, time) {
    if (step !== 0) return;
    const variant = this.laneVariant('harmony');
    const culture = this.profile.cultureId;
    const duration = this.profile.meterSteps * BEAT / 4 * (variant === 3 ? 2.1 : 1.18);
    let notes = this.profileChord(chordDegree);
    if (culture === 'chinese') {
      const root = scaleNote(this.profile.tonic, chordDegree, this.profile.mode);
      notes = [root, root + 7, root + 12].slice(0, variant === 0 ? 2 : 3);
    } else if (culture === 'indian') notes = [this.profile.tonic - 12, this.profile.tonic, this.profile.tonic + 7];
    this.pad(notes, time, duration, culture === 'indian' ? 0.0105 : 0.0085 + variant * 0.0005);
    this.markTrack('harmony', time, this.currentSection === 'open' ? 0.82 : 0.58, culture === 'indian' ? 'drone' : 'pad', this.sequence.slice(0, 3).map((star) => star.id));
  }

  scheduleLeadLane(step, bar, chordDegree, time, star) {
    const meter = this.profile.meterSteps;
    const variant = this.laneVariant('lead');
    const gates = variant === 2 ? [Math.floor(meter * 0.32), Math.floor(meter * 0.56), meter - 2] : [Math.floor(meter * 0.44), meter - 1];
    if (!gates.includes(step)) return;
    const degree = this.profile.cultureId === 'indian'
      ? [0, 1, 4, 1][(bar + step) % 4]
      : this.degreeForStep(star, bar + step) + (this.profile.cultureId === 'western' ? chordDegree : 0);
    const note = scaleNote(this.profile.tonic + 12, degree, this.profile.mode);
    if (this.profile.cultureId === 'indian') this.ornamentLead(note, time, BEAT * 1.6, 0.015, star?.pan ?? 0);
    else this.melodicVoice(note, time, BEAT * (variant === 2 ? 0.72 : 1.65), 0.0145, star?.pan ?? 0);
    this.markTrack('lead', time, 0.72, 'lead', [star?.id].filter(Boolean));
  }

  scheduleTextureLane(step, bar, time, star) {
    const meter = this.profile.meterSteps;
    const variant = this.laneVariant('texture');
    const culture = this.profile.cultureId;
    if (step === 0 && (bar + variant) % 2 === 0) {
      const note = this.noteForStep(star, bar, culture === 'indian' ? 0 : 12);
      this.sweep(note, time, BEAT * (culture === 'indian' ? 4.8 : 2.7), 0.0048, culture === 'chinese' ? 700 : 420, culture === 'western' ? 4400 : 2600, 'sine', (star?.pan ?? 0) * 0.45);
      this.markTrack('texture', time, 0.48, 'texture', [star?.id].filter(Boolean));
    }
    if (step === meter - 3 && unitNoise(this.profile.seed + bar * 97 + variant) > (culture === 'chinese' ? 0.78 : 0.56)) {
      this.sampleGlitch(time, culture === 'chinese' ? 0.0045 : 0.0075, star?.pan ?? 0, this.profile.seed + bar * 97);
      this.markTrack('texture', time, 0.56, 'glitch', [star?.id].filter(Boolean));
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
    gain.exponentialRampToValueAtTime(0.68, time + BEAT * 0.58);
  }

  sampleHat(time, gain = 0.012, pan = 0) {
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
    this.connectArrangement(panner, 0.04);
    this.register(source);
    source.start(time, unitNoise(time * 37) * 2.6, 0.055); source.stop(time + 0.06);
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

  technoKick(time, gain = 0.13, variant = 0) {
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
    body.connect(bodyEnvelope).connect(this.master);
    this.register(body); body.start(time); body.stop(time + recipe.decay + 0.03);

    const punch = this.context.createOscillator();
    const punchFilter = this.context.createBiquadFilter();
    const punchEnvelope = this.context.createGain();
    punch.type = 'triangle'; punch.frequency.setValueAtTime(118, time);
    punch.frequency.exponentialRampToValueAtTime(55, time + 0.07);
    punchFilter.type = 'lowpass'; punchFilter.frequency.value = 260; punchFilter.Q.value = 1.8;
    punchEnvelope.gain.setValueAtTime(gain * recipe.punch, time);
    punchEnvelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.115);
    punch.connect(punchFilter).connect(punchEnvelope).connect(this.master);
    this.register(punch); punch.start(time); punch.stop(time + 0.13);

    const click = this.context.createBufferSource();
    const clickFilter = this.context.createBiquadFilter();
    const clickEnvelope = this.context.createGain();
    click.buffer = this.noiseBuffer;
    clickFilter.type = 'bandpass'; clickFilter.frequency.value = 3400; clickFilter.Q.value = 1.25;
    clickEnvelope.gain.setValueAtTime(gain * recipe.click, time);
    clickEnvelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.018);
    click.connect(clickFilter).connect(clickEnvelope).connect(this.master);
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
