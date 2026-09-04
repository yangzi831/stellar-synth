/*
 * Stellar Synth visual background bridge.
 *
 * This is intentionally an input adapter, not a replacement for the visual
 * scenes in stellar-synth-visuals. It keeps the foreground atlas untouched and
 * gives the page one small, deterministic canvas background that follows the
 * same three-layer contract used by the visual library.
 */
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));
const TAU = Math.PI * 2;

const PROFILES = {
  'invisible-universe': { hue: 205, mode: 'dust', density: 54, drift: 0.18, line: 0.08 },
  'aurora-core': { hue: 165, mode: 'aurora', density: 42, drift: 0.28, line: 0.12 },
  'silver-meridian': { hue: 215, mode: 'meridian', density: 30, drift: 0.12, line: 0.16 },
  'thread-veil': { hue: 280, mode: 'threads', density: 34, drift: 0.22, line: 0.12 },
  'constellation-pulse-a': { hue: 35, mode: 'pulse', density: 36, drift: 0.15, line: 0.14 },
  'resonant-nebula': { hue: 188, mode: 'nebula', density: 76, drift: 0.24, line: 0.06 },
  'constellation-cipher': { hue: 48, mode: 'cipher', density: 44, drift: 0.2, line: 0.15 },
  'constellation-weave': { hue: 245, mode: 'weave', density: 52, drift: 0.25, line: 0.13 },
  'night-stardust': { hue: 255, mode: 'stardust', density: 82, drift: 0.34, line: 0.05 },
  'audio-reactive-cosmos': { hue: 195, mode: 'cosmos', density: 66, drift: 0.3, line: 0.09 },
  'stellar-vortex-core': { hue: 300, mode: 'vortex', density: 58, drift: 0.3, line: 0.12 },
  'audio-reactive-star-chart': { hue: 205, mode: 'chart', density: 38, drift: 0.16, line: 0.2 },
  'constellation-pulse-b': { hue: 18, mode: 'pulse', density: 48, drift: 0.18, line: 0.15 },
  'supernova-pulse': { hue: 8, mode: 'burst', density: 60, drift: 0.34, line: 0.09 },
  'concentric-field': { hue: 42, mode: 'concentric', density: 46, drift: 0.12, line: 0.2 },
};

const CULTURE_SCENES = {
  chinese: 'concentric-field',
  indian: 'resonant-nebula',
  western: 'audio-reactive-star-chart',
  egyptian: 'constellation-pulse-a',
  hawaiian_starlines: 'orbital-cartography',
  maori: 'stellar-vortex-core',
  tongan: 'thread-veil',
  inuit: 'aurora-core',
  northern_andes: 'constellation-cipher',
  tukano: 'audio-reactive-cosmos',
  navajo: 'constellation-weave',
  blackfoot: 'supernova-pulse',
  boorong: 'night-stardust',
  aztec: 'constellation-pulse-b',
  tupi: 'invisible-universe',
};

// The orbital-cartography scene is represented by the same restrained orbit
// renderer as the other backgrounds; keeping it local avoids bundling a second
// Three.js runtime into the main atlas page.
PROFILES['orbital-cartography'] = { hue: 150, mode: 'orbit', density: 40, drift: 0.2, line: 0.16 };

export class VisualBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d');
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.sceneId = 'concentric-field';
    this.cultureId = 'chinese';
    this.profile = PROFILES[this.sceneId];
    this.audio = { amplitude: 0, bass: 0, mid: 0, high: 0, energy: 0, beat: 0, drone: 0 };
    this.events = [];
    this.stars = [];
    this.seed = 17;
    this.lastTime = 0;
    this.resize();
  }

  setCulture(cultureId) {
    this.cultureId = cultureId || this.cultureId;
    this.setScene(CULTURE_SCENES[this.cultureId] || 'invisible-universe');
  }

  setScene(sceneId) {
    this.sceneId = sceneId || this.sceneId;
    this.profile = PROFILES[this.sceneId] || PROFILES['invisible-universe'];
    this.seed = [...this.sceneId].reduce((sum, char) => sum + char.charCodeAt(0), 17);
  }

  setAudioData(data = {}) {
    for (const key of Object.keys(this.audio)) {
      if (data[key] !== undefined) this.audio[key] = clamp(data[key]);
    }
  }

  triggerEvent(event = {}) {
    const type = event.type || 'pulse';
    this.events.push({ type, intensity: clamp(event.intensity ?? event.amount ?? 0.6), born: performance.now() / 1000 });
    if (this.events.length > 48) this.events.splice(0, this.events.length - 48);
  }

  triggerStar(starData = {}) {
    const ra = Number(starData.ra ?? starData.rightAscension ?? 12);
    const dec = Number(starData.dec ?? starData.declination ?? 0);
    this.stars.push({
      x: ((ra % 24 + 24) % 24) / 24,
      y: clamp(0.5 - dec / 180, 0.08, 0.92),
      born: performance.now() / 1000,
      intensity: clamp(starData.intensity ?? 0.8),
    });
    if (this.stars.length > 32) this.stars.shift();
  }

  resize() {
    if (!this.canvas) return;
    this.width = Math.max(1, window.innerWidth);
    this.height = Math.max(1, window.innerHeight);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  random(index, salt = 0) {
    const value = Math.sin((this.seed + index * 97 + salt * 13) * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  }

  eventEnergy(type, now) {
    let energy = 0;
    this.events = this.events.filter((event) => {
      const age = now - event.born;
      if (age > 1.4) return false;
      if (type && event.type !== type) return true;
      energy += event.intensity * Math.max(0, 1 - age / (type === 'kick' ? 0.42 : 0.75));
      return true;
    });
    return clamp(energy, 0, 1);
  }

  color(alpha, lightness = 72, saturation = 38) {
    return `hsla(${this.profile.hue}, ${saturation}%, ${lightness}%, ${clamp(alpha, 0, 1)})`;
  }

  drawParticles(now, count, energy) {
    const ctx = this.ctx;
    const { width, height, profile } = this;
    for (let i = 0; i < count; i += 1) {
      const x0 = this.random(i, 1) * width;
      const y0 = this.random(i, 2) * height;
      const phase = this.random(i, 3) * TAU;
      const speed = profile.drift * (0.35 + this.random(i, 4)) * 12;
      const x = (x0 + Math.cos(phase) * speed * now) % width;
      const y = (y0 + Math.sin(phase * 1.7) * speed * now) % height;
      const size = 0.35 + this.random(i, 5) * 1.35 + energy * 1.2;
      const alpha = 0.035 + this.random(i, 6) * 0.075 + this.audio.high * 0.06;
      ctx.fillStyle = this.color(alpha, 74, 30);
      ctx.fillRect((x + width) % width, (y + height) % height, size, size);
    }
  }

  draw(now) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const { width, height, profile } = this;
    const dt = this.lastTime ? Math.min(0.05, now - this.lastTime) : 0.016;
    this.lastTime = now;
    const kick = Math.max(this.audio.bass, this.eventEnergy('kick', now));
    const hat = Math.max(this.audio.high * 0.8, this.eventEnergy('hat', now));
    const energy = clamp(this.audio.energy * 0.8 + this.audio.amplitude * 0.25 + kick * 0.35);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(2,2,2,.18)';
    ctx.fillRect(0, 0, width, height);
    const cx = width * 0.5;
    const cy = height * 0.49;
    const scale = Math.min(width, height);
    const pulse = 1 + kick * 0.055 + Math.sin(now * 0.17) * 0.004;

    this.drawParticles(now, profile.density, energy);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    if (profile.mode === 'nebula' || profile.mode === 'aurora' || profile.mode === 'dust' || profile.mode === 'cosmos') {
      const gradient = ctx.createRadialGradient(cx, cy, scale * 0.02, cx, cy, scale * (0.58 + energy * 0.08));
      gradient.addColorStop(0, this.color(0.055 + energy * 0.03, 73, 30));
      gradient.addColorStop(0.45, this.color(0.022, 64, 34));
      gradient.addColorStop(1, 'rgba(2,2,2,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
    const rings = profile.mode === 'concentric' || profile.mode === 'pulse' || profile.mode === 'burst' ? 7 : 4;
    for (let i = 0; i < rings; i += 1) {
      const radius = scale * (0.12 + i * 0.105) * pulse + Math.sin(now * (0.1 + i * 0.013) + i) * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TAU);
      ctx.strokeStyle = this.color(profile.line * (0.35 + energy * 0.42) * (1 - i / (rings + 2)), 72, 32);
      ctx.lineWidth = i === 0 ? 1 : 0.55;
      ctx.stroke();
    }
    if (profile.mode === 'orbit' || profile.mode === 'vortex' || profile.mode === 'threads' || profile.mode === 'weave') {
      for (let i = 0; i < 5; i += 1) {
        const radius = scale * (0.12 + i * 0.09) * pulse;
        ctx.beginPath();
        for (let s = 0; s <= 48; s += 1) {
          const angle = s / 48 * TAU + now * (0.015 + i * 0.004) * (profile.mode === 'vortex' ? 1.8 : 1);
          const wobble = Math.sin(angle * 3 + i) * (4 + energy * 10);
          const x = cx + Math.cos(angle) * (radius + wobble);
          const y = cy + Math.sin(angle) * (radius * 0.54 + wobble * 0.3);
          if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = this.color(profile.line * 0.72, 70, 36);
        ctx.lineWidth = 0.65;
        ctx.stroke();
      }
    }
    if (profile.mode === 'chart' || profile.mode === 'cipher' || profile.mode === 'meridian') {
      const points = Array.from({ length: 12 }, (_, i) => ({
        x: width * (0.15 + this.random(i, 7) * 0.7),
        y: height * (0.2 + this.random(i, 8) * 0.6),
      }));
      ctx.strokeStyle = this.color(profile.line * 0.8, 78, 28);
      ctx.lineWidth = 0.5;
      for (let i = 1; i < points.length; i += 1) {
        ctx.beginPath(); ctx.moveTo(points[i - 1].x, points[i - 1].y); ctx.lineTo(points[i].x, points[i].y); ctx.stroke();
      }
      points.forEach((point, i) => {
        ctx.fillStyle = this.color(0.05 + hat * 0.1, 82, 38);
        ctx.beginPath(); ctx.arc(point.x, point.y, 1 + (i % 3) * 0.45 + hat, 0, TAU); ctx.fill();
      });
    }
    if (kick > 0.04) {
      ctx.beginPath(); ctx.arc(cx, cy, scale * (0.11 + kick * 0.25), 0, TAU);
      ctx.strokeStyle = this.color(0.12 * kick, 80, 42);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    if (hat > 0.04) {
      ctx.fillStyle = this.color(0.05 * hat, 88, 42);
      for (let i = 0; i < 9; i += 1) {
        const x = width * (0.15 + this.random(i, Math.floor(now * 12)) * 0.7);
        const y = height * (0.14 + this.random(i, Math.floor(now * 16) + 5) * 0.72);
        ctx.fillRect(x, y, 1 + hat * 1.4, 1 + hat * 1.4);
      }
    }
    ctx.restore();

    this.stars = this.stars.filter((star) => {
      const age = now - star.born;
      if (age > 1.4) return false;
      const x = star.x * width;
      const y = star.y * height;
      const fade = (1 - age / 1.4) * star.intensity;
      ctx.beginPath(); ctx.arc(x, y, 8 + fade * 24, 0, TAU);
      ctx.strokeStyle = this.color(fade * 0.16, 88, 36); ctx.lineWidth = 0.8; ctx.stroke();
      return true;
    });
    // Keep the adapter deterministic but let the browser breathe on throttled tabs.
    if (dt > 0.045) this.events = this.events.slice(-24);
  }

  render(now) { this.draw(now); }

  dispose() {
    this.events = [];
    this.stars = [];
    this.ctx?.clearRect(0, 0, this.width, this.height);
  }
}

export const VISUAL_CULTURE_SCENES = CULTURE_SCENES;
