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
    this.arrangementStep = 0;
    this.nextArrangementTick = 0;
    this.sequence = [];
    this.profile = this.createProfile([], {});
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
    const mode = MODES[seed % MODES.length];
    const meterSteps = METERS[(seed >>> 3) % METERS.length];
    const progression = PROGRESSIONS[(seed >>> 6) % PROGRESSIONS.length];
    return {
      seed,
      modeId: mode.id,
      mode: mode.intervals,
      tonic: TONICS[(seed >>> 10) % TONICS.length],
      meterSteps,
      progression,
      arpStride: [2, 3, 4][(seed >>> 14) % 3],
      timbre: (seed >>> 17) % 4,
      drumStyle: (seed >>> 20) % 4,
      cadence: (seed >>> 23) % 3,
    };
  }

  setSequence(sequence, identity = {}) {
    this.sequence = sequence || [];
    this.profile = this.createProfile(this.sequence, identity);
    this.tick = 0;
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
      if (this.sequence.length) {
        const stepIndex = this.tick % this.sequence.length;
        this.triggerStep(this.sequence[stepIndex], stepIndex, this.nextTick, false);
        const delay = clamp(this.sequence[stepIndex]?.interval || 1, 0.55, 2.4);
        this.nextTick += EIGHTH * delay;
        this.dispatchEvent(new CustomEvent('step', { detail: { index: stepIndex, tick: this.tick } }));
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
    this.filteredPluck(step, index, now + 0.006);
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

  filteredPluck(step, index, time) {
    if (this.voices >= MAX_VOICES) return;
    const ac = this.context;
    const magnitude = Number.isFinite(step.mag) ? step.mag : 4;
    const velocity = clamp(1.05 - (magnitude + 1.3) / 8.5, 0.22, 0.92);
    const note = this.noteForStep(step, index, 12);
    const pan = clamp((step.pan ?? 0) * 0.82, -0.88, 0.88);
    const oscillator = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const envelope = ac.createGain();
    const panner = ac.createStereoPanner();
    oscillator.type = ['sine', 'triangle', 'triangle', 'sine'][this.profile.timbre];
    oscillator.frequency.setValueAtTime(midi(note + 12), time);
    oscillator.frequency.exponentialRampToValueAtTime(midi(note), time + 0.035);
    filter.type = 'lowpass'; filter.Q.value = 5.5;
    filter.frequency.setValueAtTime(5200 + velocity * 1800, time);
    filter.frequency.exponentialRampToValueAtTime(680 + velocity * 900, time + 0.12);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(0.07 * velocity, time + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.125);
    panner.pan.value = pan;
    oscillator.connect(filter).connect(envelope).connect(panner);
    this.connectGesture(panner);
    this.register(oscillator);
    oscillator.start(time); oscillator.stop(time + 0.15);
    this.gestureNoise(time, 0.11, 0.012 * velocity, 2600 + velocity * 2400, 6, pan, index * 17);
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

  scheduleArrangement(stepNumber, time) {
    if (!this.sequence.length || !this.arrangementBus) return;
    const profile = this.profile;
    const cycleStep = stepNumber % profile.meterSteps;
    const cycleIndex = Math.floor(stepNumber / profile.meterSteps);
    const progressionIndex = cycleIndex % profile.progression.length;
    const chordDegree = profile.progression[progressionIndex];
    const phraseNoise = unitNoise(profile.seed + cycleIndex * 31);
    const sourceStep = this.sequence[stepNumber % this.sequence.length];
    const nextStep = this.sequence[(stepNumber * 3 + 1) % this.sequence.length] || sourceStep;
    const groovePatterns = [
      [0, Math.floor(profile.meterSteps * 0.58)],
      Array.from({ length: Math.ceil(profile.meterSteps / 4) }, (_, index) => index * 4),
      [0, Math.floor(profile.meterSteps * 0.3), Math.floor(profile.meterSteps * 0.68)],
      [0, 3, Math.floor(profile.meterSteps * 0.5), profile.meterSteps - 2],
    ];
    const kicks = [...new Set(groovePatterns[profile.drumStyle].filter((step) => step < profile.meterSteps))];
    const isKick = kicks.includes(cycleStep);

    // Meter and drum weight belong to this landmark; only one profile keeps a
    // straight four-on-the-floor pattern, while others breathe asymmetrically.
    if (isKick) {
      this.technoKick(time, cycleStep === 0 ? 0.138 : 0.112);
      this.pump(time, cycleStep === 0 ? 0.34 : 0.41);
    }
    if ((cycleStep + profile.drumStyle) % 4 === 2) {
      this.sampleHat(time, cycleStep === profile.meterSteps - 2 ? 0.013 : 0.009, (nextStep?.pan ?? 0) * 0.45);
    }
    if (profile.drumStyle % 2 === 1 && cycleStep === Math.floor(profile.meterSteps / 2)) {
      this.sampleClap(time, 0.011, sourceStep?.pan ?? 0);
    }

    // Bass follows this generated harmony but inherits its rhythmic gates from the
    // landmark's meter and stellar path, rather than a universal dance pattern.
    if (isKick || cycleStep === profile.meterSteps - 1) {
      const bassDegree = cycleStep === profile.meterSteps - 1 ? chordDegree + 4 : chordDegree;
      const bassNote = scaleNote(profile.tonic - 12, bassDegree, profile.mode);
      this.electricBass(bassNote, time, BEAT * (isKick ? 0.74 : 0.42), 0.028 + profile.drumStyle * 0.0015);
    }

    // Each star chooses a chord member and register. The chord keeps the result
    // consonant; the star order keeps different landmarks melodically distinct.
    if ((cycleStep + 1) % profile.arpStride === 0) {
      const chordOffsets = [0, 2, 4];
      const starDegree = this.degreeForStep(nextStep, stepNumber);
      const chordOffset = chordOffsets[starDegree % chordOffsets.length];
      const octave = Number.isFinite(nextStep?.mag) && nextStep.mag < 2.2 ? 24 : 12;
      const arpNote = scaleNote(profile.tonic + octave, chordDegree + chordOffset, profile.mode);
      this.arp(arpNote, time, BEAT * (0.58 + profile.arpStride * 0.08), 0.0145, (nextStep?.pan ?? 0) * 0.6);
    }

    // Chord duration follows the landmark's own cycle (3/4, 7/8, 4/4 or 5/4).
    if (cycleStep === 0) {
      const chord = [0, 2, 4].map((offset) => scaleNote(profile.tonic, chordDegree + offset, profile.mode));
      const cycleDuration = profile.meterSteps * BEAT / 4;
      this.pad(chord, time, cycleDuration * 1.12, 0.0095);
      if (progressionIndex === 0) {
        const formDuration = cycleDuration * profile.progression.length;
        this.pad([profile.tonic - 12, profile.tonic, profile.tonic + 12], time, formDuration * 1.08, 0.0048);
      }
    }

    // Two melodic landmarks per cycle are taken directly from the current path.
    const melodicGates = [Math.floor(profile.meterSteps * 0.42), profile.meterSteps - 1];
    if (melodicGates.includes(cycleStep)) {
      const phraseEnd = cycleStep === profile.meterSteps - 1 && progressionIndex === profile.progression.length - 1;
      const melodicDegree = phraseEnd && profile.cadence !== 2
        ? (profile.cadence === 1 ? 4 : 0)
        : this.degreeForStep(sourceStep, cycleIndex);
      const leadNote = scaleNote(profile.tonic + 12, melodicDegree, profile.mode);
      this.melodicVoice(leadNote, time, BEAT * (phraseEnd ? 2.8 : 1.35), phraseEnd ? 0.018 : 0.0135, sourceStep?.pan ?? 0);
    }

    if (cycleStep === profile.meterSteps - 3 && phraseNoise > 0.58) {
      this.sampleGlitch(time, 0.0085, phraseNoise > 0.76 ? 0.62 : -0.62, profile.seed + cycleIndex * 97);
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

  technoKick(time, gain = 0.13) {
    if (this.voices >= MAX_VOICES - 2) return;
    const bodyEnvelope = this.context.createGain();
    bodyEnvelope.gain.setValueAtTime(gain, time);
    bodyEnvelope.gain.exponentialRampToValueAtTime(gain * 0.34, time + 0.075);
    bodyEnvelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.27);
    const body = this.context.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(190, time);
    body.frequency.exponentialRampToValueAtTime(48, time + 0.055);
    body.frequency.exponentialRampToValueAtTime(42, time + 0.2);
    body.connect(bodyEnvelope).connect(this.master);
    this.register(body); body.start(time); body.stop(time + 0.29);

    const punch = this.context.createOscillator();
    const punchFilter = this.context.createBiquadFilter();
    const punchEnvelope = this.context.createGain();
    punch.type = 'triangle'; punch.frequency.setValueAtTime(118, time);
    punch.frequency.exponentialRampToValueAtTime(55, time + 0.07);
    punchFilter.type = 'lowpass'; punchFilter.frequency.value = 260; punchFilter.Q.value = 1.8;
    punchEnvelope.gain.setValueAtTime(gain * 0.68, time);
    punchEnvelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.115);
    punch.connect(punchFilter).connect(punchEnvelope).connect(this.master);
    this.register(punch); punch.start(time); punch.stop(time + 0.13);

    const click = this.context.createBufferSource();
    const clickFilter = this.context.createBiquadFilter();
    const clickEnvelope = this.context.createGain();
    click.buffer = this.noiseBuffer;
    clickFilter.type = 'bandpass'; clickFilter.frequency.value = 3400; clickFilter.Q.value = 1.25;
    clickEnvelope.gain.setValueAtTime(gain * 0.24, time);
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
