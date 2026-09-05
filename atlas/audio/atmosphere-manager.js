import { padForCulture } from './pad-library.js';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));

/**
 * Independent looping atmosphere layer for PLAY mode.
 *
 * The manager borrows the sequencer's already-running AudioContext and music
 * bus, but owns its own source, filters, fades, and cache. Star voices and the
 * arrangement never need to know that a pad exists.
 */
export class AtmospherePadManager {
  constructor(engine, options = {}) {
    this.engine = engine;
    this.resolvePad = options.resolvePad || padForCulture;
    this.busGainLevel = Number.isFinite(options.busGain) ? options.busGain : 1;
    this.reverbSendLevel = Number.isFinite(options.reverbSend) ? options.reverbSend : 0.11;
    this.fadeInSeconds = clamp(options.fadeInSeconds ?? 1.4, 0.2, 3);
    this.fadeOutSeconds = clamp(options.fadeOutSeconds ?? 1.25, 0.2, 3);
    this.crossfadeSeconds = clamp(options.crossfadeSeconds ?? 0.09, 0.02, 0.3);
    this.cache = new Map();
    this.busReady = false;
    this.busGain = null;
    this.highpass = null;
    this.lowpass = null;
    this.panner = null;
    this.current = null;
    this.switchToken = 0;
  }

  async ensureBus() {
    await this.engine?.ensure?.();
    const context = this.engine?.context;
    if (!context) throw new Error('Audio context is unavailable for atmosphere pad');
    if (this.busReady) return context;

    this.busGain = context.createGain();
    this.busGain.gain.value = this.busGainLevel;
    this.highpass = context.createBiquadFilter();
    this.highpass.type = 'highpass';
    this.highpass.frequency.value = 92;
    this.highpass.Q.value = 0.45;
    this.lowpass = context.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 6200;
    this.lowpass.Q.value = 0.35;
    this.panner = context.createStereoPanner();

    const destination = this.engine.musicBus || this.engine.bedBus || this.engine.master || context.destination;
    this.highpass.connect(this.lowpass).connect(this.panner).connect(this.busGain).connect(destination);

    // A restrained send into the engine's existing pre-delay/reverb keeps the
    // pad behind the dry star transient without washing the whole mix out.
    if (this.engine.reverbSend) {
      const send = context.createGain();
      send.gain.value = this.reverbSendLevel;
      this.panner.connect(send).connect(this.engine.reverbSend);
      this.reverbSend = send;
    }
    this.busReady = true;
    return context;
  }

  async loadBuffer(pad) {
    if (this.cache.has(pad.id)) return this.cache.get(pad.id);
    const context = this.engine.context;
    const response = await fetch(pad.file, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Atmosphere pad request failed: ${response.status}`);
    const encoded = await response.arrayBuffer();
    const decoded = await context.decodeAudioData(encoded);
    const loopBuffer = this.makeCrossfadeBuffer(context, decoded);
    this.cache.set(pad.id, loopBuffer);
    return loopBuffer;
  }

  makeCrossfadeBuffer(context, sourceBuffer) {
    const fadeFrames = Math.max(8, Math.min(
      Math.floor(sourceBuffer.length * 0.08),
      Math.floor(context.sampleRate * this.crossfadeSeconds),
      Math.floor(sourceBuffer.length / 4),
    ));
    if (fadeFrames < 8 || sourceBuffer.length < fadeFrames * 2) return sourceBuffer;

    // Blend the tail into the head over the first few milliseconds. The
    // resulting loop remains a normal AudioBufferSourceNode with loop=true,
    // while the boundary no longer presents a hard waveform discontinuity.
    const result = context.createBuffer(sourceBuffer.numberOfChannels, sourceBuffer.length, sourceBuffer.sampleRate);
    for (let channelIndex = 0; channelIndex < sourceBuffer.numberOfChannels; channelIndex += 1) {
      const input = sourceBuffer.getChannelData(channelIndex);
      const output = result.getChannelData(channelIndex);
      output.set(input);
      for (let index = 0; index < fadeFrames; index += 1) {
        const progress = index / Math.max(1, fadeFrames - 1);
        const tail = input[sourceBuffer.length - fadeFrames + index];
        const head = input[index];
        output[index] = tail * (1 - progress) + head * progress;
      }
    }
    return result;
  }

  createSource(pad, buffer, context, startAt) {
    const source = context.createBufferSource();
    const sourceGain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = buffer.duration;
    sourceGain.gain.setValueAtTime(0.0001, startAt);
    sourceGain.gain.linearRampToValueAtTime(pad.gain, startAt + this.fadeInSeconds);
    source.connect(sourceGain).connect(this.highpass);
    this.panner.pan.setValueAtTime(pad.pan, startAt);
    source.addEventListener?.('ended', () => {
      if (this.current?.source === source) this.current = null;
    });
    source.start(startAt);
    return { source, sourceGain, pad };
  }

  async playForCulture(cultureId = '') {
    const token = ++this.switchToken;
    const context = await this.ensureBus();
    const pad = this.resolvePad(cultureId);
    if (!pad) {
      this.stop();
      return false;
    }
    const buffer = await this.loadBuffer(pad);
    if (token !== this.switchToken) return false;

    if (this.current?.pad.id === pad.id && this.current.source) {
      const now = context.currentTime;
      this.current.sourceGain.gain.cancelScheduledValues(now);
      this.current.sourceGain.gain.setTargetAtTime(pad.gain, now, 0.18);
      return true;
    }

    const old = this.current;
    const now = context.currentTime;
    if (old?.source) {
      old.sourceGain.gain.cancelScheduledValues(now);
      old.sourceGain.gain.setTargetAtTime(0.0001, now, this.fadeOutSeconds / 3);
      try { old.source.stop(now + this.fadeOutSeconds + 0.08); } catch { /* already ended */ }
    }

    const entry = this.createSource(pad, buffer, context, now + 0.015);
    this.current = entry;
    return true;
  }

  stop({ immediate = false } = {}) {
    this.switchToken += 1;
    const current = this.current;
    if (!current?.source || !this.engine?.context) {
      this.current = null;
      return;
    }
    const context = this.engine.context;
    const now = context.currentTime;
    current.sourceGain.gain.cancelScheduledValues(now);
    if (immediate) {
      current.sourceGain.gain.setValueAtTime(0.0001, now);
      try { current.source.stop(now + 0.015); } catch { /* already ended */ }
      this.current = null;
      return;
    }
    current.sourceGain.gain.setTargetAtTime(0.0001, now, this.fadeOutSeconds / 3);
    try { current.source.stop(now + this.fadeOutSeconds + 0.08); } catch { /* already ended */ }
    this.current = null;
  }

  dispose() {
    this.stop({ immediate: true });
    this.cache.clear();
    this.busGain?.disconnect();
    this.highpass?.disconnect();
    this.lowpass?.disconnect();
    this.panner?.disconnect();
    this.reverbSend?.disconnect();
    this.busGain = null;
    this.highpass = null;
    this.lowpass = null;
    this.panner = null;
    this.reverbSend = null;
    this.busReady = false;
  }
}
