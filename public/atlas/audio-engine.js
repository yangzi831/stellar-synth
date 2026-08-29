/*
 * Derived from D5 v12 Topological Playground and the D5 v13 Sequencer Map
 * patch by Ewan Qian / 钱誉文. Used and modified under the MIT License.
 * The signal path remains synthesis-only: oscillators, filtered noise,
 * stereo panning, gain envelopes and dynamics compression.
 */

export const BPM = 150;
const BEAT = 60 / BPM;
const EIGHTH = BEAT / 2;
const LOOK_AHEAD = 0.13;
const MAX_VOICES = 64;
const MAX_INTERACTIONS = 8;
const MASTER_GAIN = 0.95;
const HOLD_THRESHOLD_MS = 350;
const TWO_BARS = BEAT * 8;
const SCALE = [0, 2, 3, 7, 9, 12, 14, 15, 19, 21];

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
    this.running = false;
    this.timer = null;
    this.nextTick = 0;
    this.tick = 0;
    this.sequence = [];
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

  setSequence(sequence) {
    this.sequence = sequence || [];
    this.tick = 0;
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
    const note = 48 + SCALE[Math.abs(step.id || index) % SCALE.length];
    const pan = clamp((step.pan ?? 0) * 0.82, -0.88, 0.88);
    const oscillator = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const envelope = ac.createGain();
    const panner = ac.createStereoPanner();
    oscillator.type = index % 3 === 0 ? 'sine' : 'triangle';
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
    const note = 40 + SCALE[Math.abs(session.step.id || session.index) % SCALE.length] + session.octave;
    const oscillator = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const envelope = ac.createGain();
    const panner = ac.createStereoPanner();
    oscillator.type = session.index % 2 ? 'triangle' : 'sine';
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
    const note = 45 + SCALE[Math.abs(session.step.id || session.index) % SCALE.length] + session.octave;
    const oscillator = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const envelope = ac.createGain();
    const panner = ac.createStereoPanner();
    oscillator.type = 'triangle'; oscillator.frequency.value = midi(note);
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
    const base = 45 + SCALE[Math.abs(step.id || index) % SCALE.length];
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

  kick(time, gain = 0.08) {
    if (this.voices >= MAX_VOICES) return;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.frequency.setValueAtTime(160, time);
    oscillator.frequency.exponentialRampToValueAtTime(43, time + 0.11);
    envelope.gain.setValueAtTime(gain, time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    oscillator.connect(envelope).connect(this.master);
    this.register(oscillator);
    oscillator.start(time); oscillator.stop(time + 0.18);
  }
}
