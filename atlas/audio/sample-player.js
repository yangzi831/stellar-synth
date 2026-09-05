import { instrumentForStar, instrumentSetForCulture } from './civilization-samples.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

/**
 * Short user-provided instrument samples. Every source follows the same path:
 * source → voice gain → instrument bus → shared reverb send/master.
 */
export class CivilizationSamplePlayer {
  constructor(engine, options = {}) {
    this.engine = engine;
    this.fadeInSeconds = clamp(options.fadeInSeconds ?? 0.006, 0.001, 0.04);
    this.cache = new Map();
    this.loading = new Map();
    this.busReady = false;
    this.bus = null;
    this.highpass = null;
    this.lowpass = null;
    this.reverbSend = null;
  }

  async ensureBus() {
    await this.engine?.ensure?.();
    const context = this.engine?.context;
    if (!context) throw new Error('Audio context is unavailable for civilization samples');
    if (this.busReady) return context;
    this.bus = context.createGain();
    this.bus.gain.value = 1;
    this.highpass = context.createBiquadFilter();
    this.highpass.type = 'highpass';
    this.highpass.frequency.value = 120;
    this.highpass.Q.value = 0.45;
    this.lowpass = context.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 8800;
    this.lowpass.Q.value = 0.35;
    this.highpass.connect(this.lowpass).connect(this.bus).connect(this.engine.musicBus || this.engine.arrangementBus || this.engine.master);
    if (this.engine.reverbSend) {
      this.reverbSend = context.createGain();
      this.reverbSend.gain.value = 0.18;
      this.bus.connect(this.reverbSend).connect(this.engine.reverbSend);
    }
    this.busReady = true;
    return context;
  }

  async load(entry) {
    if (!entry) return null;
    if (this.cache.has(entry.id)) return this.cache.get(entry.id);
    if (this.loading.has(entry.id)) return this.loading.get(entry.id);
    const task = (async () => {
      const context = await this.ensureBus();
      const response = await fetch(entry.file, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Civilization sample request failed: ${response.status}`);
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      this.cache.set(entry.id, buffer);
      return buffer;
    })().catch((error) => {
      console.warn(`Sample unavailable: ${entry?.id || 'unknown'}`, error);
      return null;
    }).finally(() => this.loading.delete(entry.id));
    this.loading.set(entry.id, task);
    return task;
  }

  async prepareCulture(cultureId = '') {
    const set = instrumentSetForCulture(cultureId);
    if (!set?.length) return false;
    await Promise.all(set.map((entry) => this.load(entry)));
    return true;
  }

  playForStar(cultureId, starIndex, time, options = {}) {
    const entry = instrumentForStar(cultureId, starIndex);
    const buffer = entry ? this.cache.get(entry.id) : null;
    if (!entry || !buffer || !this.engine.context || !this.busReady) {
      if (entry) void this.load(entry);
      return false;
    }
    const context = this.engine.context;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    source.buffer = buffer;
    source.playbackRate.value = clamp(options.playbackRate ?? 1, 0.86, 1.14);
    const amount = clamp((options.gain ?? 1) * entry.gain, 0.0001, 0.28);
    const start = Math.max(context.currentTime + 0.001, Number(time) || context.currentTime);
    // Keep phrase assets short enough for a playable star hit and avoid
    // stacking multi-second clips on top of the synth voice.
    const requestedDuration = options.duration ?? entry.duration ?? Math.min(buffer.duration, 1.85);
    const duration = Math.max(0.045, Math.min(buffer.duration / source.playbackRate.value, requestedDuration));
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(amount, start + this.fadeInSeconds);
    gain.gain.setValueAtTime(amount * 0.92, start + Math.min(0.055, duration * 0.32));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    panner.pan.value = clamp(options.pan ?? 0, -0.86, 0.86);
    source.connect(gain).connect(panner).connect(this.highpass);
    if (entry.reverb > 0 && this.engine.reverbSend) {
      const send = context.createGain();
      send.gain.value = clamp(entry.reverb, 0, 0.5);
      panner.connect(send).connect(this.engine.reverbSend);
    }
    source.start(start);
    try { source.stop(start + duration + 0.03); } catch { /* source may already be stopped */ }
    return true;
  }

  dispose() {
    this.cache.clear();
    this.loading.clear();
    this.bus?.disconnect();
    this.highpass?.disconnect();
    this.lowpass?.disconnect();
    this.reverbSend?.disconnect();
    this.bus = null;
    this.highpass = null;
    this.lowpass = null;
    this.reverbSend = null;
    this.busReady = false;
  }
}
