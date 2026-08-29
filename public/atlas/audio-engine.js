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
const MASTER_GAIN = 0.95;
const SCALE = [0, 2, 3, 7, 9, 12, 14, 15, 19, 21];

const midi = (note) => 440 * 2 ** ((note - 69) / 12);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class SequencerAudio extends EventTarget {
  constructor() {
    super();
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.limiter = null;
    this.noiseBuffer = null;
    this.running = false;
    this.timer = null;
    this.nextTick = 0;
    this.tick = 0;
    this.sequence = [];
    this.active = new Set();
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
  }

  makeNoise() {
    const buffer = this.context.createBuffer(1, this.context.sampleRate * 3, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i += 1) channel[i] = Math.random() * 2 - 1;
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
    if (this.context && this.master) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.018);
      window.setTimeout(() => {
        if (!this.running && this.master && this.context) this.master.gain.setValueAtTime(MASTER_GAIN, this.context.currentTime);
      }, 120);
    }
    this.dispatchEvent(new CustomEvent('state', { detail: { running: false } }));
  }

  panic() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    this.running = false;
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
