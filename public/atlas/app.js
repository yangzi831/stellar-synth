import { SequencerAudio, BPM } from './audio-engine.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wrapHours = (value) => ((value + 12) % 24 + 24) % 24 - 12;
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[char]));

const canvas = $('#sky');
const ctx = canvas.getContext('2d');
const overviewCanvas = $('#overview');
const overviewCtx = overviewCanvas.getContext('2d');
const stage = $('#stage');
const audio = new SequencerAudio();

const KEYBOARD_STEPS = [
  ['Digit1', '1'], ['Digit2', '2'], ['Digit3', '3'], ['Digit4', '4'], ['Digit5', '5'],
  ['Digit6', '6'], ['Digit7', '7'], ['Digit8', '8'], ['Digit9', '9'], ['Digit0', '0'],
  ['KeyQ', 'Q'], ['KeyW', 'W'], ['KeyE', 'E'], ['KeyR', 'R'], ['KeyT', 'T'],
  ['KeyY', 'Y'], ['KeyU', 'U'], ['KeyI', 'I'], ['KeyO', 'O'], ['KeyP', 'P'],
  ['KeyA', 'A'], ['KeyS', 'S'], ['KeyD', 'D'], ['KeyF', 'F'], ['KeyG', 'G'],
  ['KeyH', 'H'], ['KeyJ', 'J'], ['KeyK', 'K'], ['KeyL', 'L'],
  ['KeyZ', 'Z'], ['KeyX', 'X'], ['KeyC', 'C'], ['KeyV', 'V'], ['KeyB', 'B'], ['KeyN', 'N'], ['KeyM', 'M'],
];

const state = {
  data: null,
  stars: new Map(),
  cultures: new Map(),
  launchSelected: 'chinese',
  cultureId: 'chinese',
  compareId: 'western',
  mode: 'atlas',
  visibleCultureId: 'chinese',
  visibleStarIds: new Set(),
  selected: null,
  localView: false,
  guide: true,
  auto: false,
  activeStep: -1,
  view: { centerRa: 12, centerDec: 0, zoom: 1, panX: 0, panY: 0 },
  transition: null,
  drawerPurpose: 'primary',
  pointer: null,
  trail: [],
  visualEvents: [],
  keyboardHeld: new Set(),
  autoLoops: 0,
};

let width = 0;
let height = 0;
let dpr = 1;
let frame = 0;

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function culture(id = state.visibleCultureId) { return state.cultures.get(id); }

function starPoint(star, view = state.view) {
  const dx = wrapHours(star.ra - view.centerRa);
  return {
    x: width / 2 + (dx / 24) * width * view.zoom + view.panX,
    y: height / 2 - ((star.dec - view.centerDec) / 180) * height * view.zoom + view.panY,
  };
}

function constellationStars(item) {
  return item.stars.map((id) => state.stars.get(id)).filter(Boolean);
}

function constellationZh(item) {
  return item?.localizedName?.zh || '';
}

function constellationLabel(item) {
  const zh = constellationZh(item);
  return zh && zh !== item.nativeName ? `${item.nativeName} · ${zh}` : item.nativeName;
}

function keyboardBinding(index) {
  const bank = Math.floor(index / KEYBOARD_STEPS.length);
  if (bank > 1) return null;
  const entry = KEYBOARD_STEPS[index % KEYBOARD_STEPS.length];
  return { code: entry[0], label: `${bank ? '⇧' : ''}${entry[1]}`, shift: bank === 1 };
}

function keyboardStepIndex(event) {
  const base = KEYBOARD_STEPS.findIndex(([code]) => code === event.code);
  if (base < 0) return -1;
  const index = base + (event.shiftKey ? KEYBOARD_STEPS.length : 0);
  return index < audio.sequence.length ? index : -1;
}

function centroid(item) {
  const stars = constellationStars(item);
  if (!stars.length) return null;
  let sx = 0; let sy = 0; let dec = 0;
  for (const star of stars) {
    const angle = (star.ra / 24) * Math.PI * 2;
    sx += Math.cos(angle); sy += Math.sin(angle); dec += star.dec;
  }
  let ra = (Math.atan2(sy, sx) / (Math.PI * 2)) * 24;
  if (ra < 0) ra += 24;
  return { ra, dec: dec / stars.length };
}

function constellationPoint(item) {
  const center = centroid(item);
  return center ? starPoint(center) : null;
}

function sequenceFor(item) {
  if (!item) return [];
  const ordered = [];
  for (const line of item.lines) {
    for (const id of line) if (ordered.at(-1) !== id) ordered.push(id);
  }
  for (const id of item.stars) if (!ordered.includes(id)) ordered.push(id);
  return ordered.map((id, index) => {
    const star = state.stars.get(id);
    const previous = state.stars.get(ordered[index - 1]);
    let interval = 1;
    if (previous && star) {
      const dra = wrapHours(star.ra - previous.ra) * 15 * Math.cos(((star.dec + previous.dec) / 2) * Math.PI / 180);
      const ddec = star.dec - previous.dec;
      interval = clamp(Math.hypot(dra, ddec) / 14, 0.55, 2.4);
    }
    return { ...star, interval, pan: star ? wrapHours(star.ra - state.view.centerRa) / 12 : 0 };
  }).filter((item) => item.id);
}

function resetView() {
  state.view = { centerRa: 12, centerDec: 0, zoom: 1, panX: 0, panY: 0 };
  state.localView = false;
  updateViewReadout();
}

function updateViewReadout() {
  const output = $('#zoom-level');
  if (output) output.textContent = `${Math.round(state.view.zoom * 100)}%`;
}

function zoomBy(factor) {
  state.view.zoom = clamp(state.view.zoom * factor, 0.65, 12);
  updateViewReadout();
}

function fitConstellation(item) {
  const stars = constellationStars(item);
  if (!stars.length) return;
  const center = centroid(item);
  const offsets = stars.map((star) => wrapHours(star.ra - center.ra));
  const minRa = Math.min(...offsets); const maxRa = Math.max(...offsets);
  const minDec = Math.min(...stars.map((star) => star.dec));
  const maxDec = Math.max(...stars.map((star) => star.dec));
  const spanRa = Math.max(1.5, maxRa - minRa);
  const spanDec = Math.max(8, maxDec - minDec);
  state.view = {
    centerRa: center.ra,
    centerDec: (minDec + maxDec) / 2,
    zoom: clamp(Math.min(15 / spanRa, 120 / spanDec), 1.25, 10),
    panX: 0,
    panY: 0,
  };
  state.localView = true;
  updateViewReadout();
}

function renderCultureGrid(target, selectionId, handler) {
  target.innerHTML = '';
  for (const region of state.data.regionOrder) {
    const entries = state.data.cultures.filter((item) => item.regionGroup === region);
    if (!entries.length) continue;
    const group = document.createElement('section');
    group.className = 'culture-group';
    group.innerHTML = `<h2>${escapeHtml(state.data.regionLabels?.[region] || region)}</h2>`;
    for (const item of entries) {
      const button = document.createElement('button');
      button.className = `culture-option${item.id === selectionId ? ' on' : ''}`;
      button.innerHTML = `<span>${escapeHtml(item.localizedName?.zh || item.nativeName)}</span><small>${escapeHtml((item.localizedName?.en || item.nativeName).toUpperCase())}</small>`;
      button.dataset.culture = item.id;
      button.addEventListener('click', () => handler(item.id));
      group.appendChild(button);
    }
    target.appendChild(group);
  }
}

function refreshGrids() {
  renderCultureGrid($('#launch-grid'), state.launchSelected, (id) => {
    state.launchSelected = id;
    enterAtlasFromLaunch(id);
  });
  const selected = state.drawerPurpose === 'compare' ? state.compareId : state.cultureId;
  renderCultureGrid($('#culture-grid'), selected, (id) => {
    if (state.drawerPurpose === 'compare') setCompareCulture(id);
    else setCulture(id);
    closeDrawer();
  });
}

function enterAtlasFromLaunch(id) {
  state.launchSelected = id;
  $('#launch').hidden = true;
  $('#shell').hidden = false;
  setCulture(id);
}

function populateLandmarkSelect() {
  const select = $('#landmark-select');
  const current = culture();
  if (!select || !current) return;
  select.innerHTML = '<option value="">从整张星图中选择 / SELECT FROM THE ATLAS</option>';
  current.constellations
    .filter((item) => item.starCount > 0)
    .forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      const zh = constellationZh(item);
      const names = [item.nativeName, zh, item.translatedName]
        .filter((name, index, all) => name && all.indexOf(name) === index);
      option.textContent = names.join(' / ');
      select.appendChild(option);
    });
  if (state.selected) select.value = state.selected.id;
}

function setVisibleCulture(id, fromId = state.visibleCultureId) {
  if (!state.cultures.has(id)) return;
  state.transition = { from: fromId, to: id, started: performance.now(), duration: 1500 };
  state.visibleCultureId = id;
  state.visibleStarIds = new Set(culture(id).stars);
  state.selected = null;
  state.activeStep = -1;
  audio.setSequence([]);
  $('#detail').hidden = true;
  const item = culture(id);
  $('#culture-region').textContent = item.regionLabel || item.regionGroup;
  $('#culture-name').textContent = state.mode === 'compare'
    ? `${culture(state.cultureId).localizedName?.zh || culture(state.cultureId).nativeName} ↔ ${item.localizedName?.zh || item.nativeName}`
    : `${item.localizedName?.zh || item.nativeName} / ${(item.localizedName?.en || item.nativeName).toUpperCase()}`;
  $('#status').textContent = `${state.mode.toUpperCase()} · ${item.constellations.length} 个星座 / LANDMARKS · 点击进入 / CLICK TO ENTER`;
  populateLandmarkSelect();
}

function setCulture(id) {
  const previous = state.visibleCultureId;
  state.cultureId = id;
  if (state.mode === 'compare' && state.compareId === id) {
    state.compareId = id === 'western' ? 'chinese' : 'western';
  }
  setVisibleCulture(id, previous);
  resetView();
  refreshGrids();
}

function setCompareCulture(id) {
  const previous = state.visibleCultureId;
  state.compareId = id;
  setVisibleCulture(id, previous);
  const primary = culture(state.cultureId);
  const secondary = culture(id);
  $('#compare-copy').textContent = `${primary.nativeName.toUpperCase()} → ${secondary.nativeName.toUpperCase()}`;
  refreshGrids();
}

function setMode(mode) {
  const previous = state.visibleCultureId;
  const previousSelected = state.selected;
  state.mode = mode;
  $$('.mode').forEach((button) => button.classList.toggle('on', button.dataset.mode === mode));
  $('#compare-panel').hidden = mode !== 'compare';
  if (mode === 'compare') {
    $('#compare-copy').textContent = `${culture(state.cultureId).nativeName.toUpperCase()} → ${culture(state.compareId).nativeName.toUpperCase()}`;
  }
  $('#legend').innerHTML = mode === 'play'
    ? '星图 = 音乐拓扑 · 恒星 = 局部音序步骤<br />ENTER → INSIDE → EXIT → CORRIDOR → NEXT NODE'
    : mode === 'compare'
      ? '恒星位置保持不动 · 文化关系重新形成<br />STARS REMAIN FIXED · RELATIONS REFORM'
      : '拖动 = 移动 · 滚轮 / 双指 = 缩放 · 点击 = 进入星座<br />DRAG = PAN · WHEEL / PINCH = ZOOM · CLICK = ENTER';
  setVisibleCulture(mode === 'compare' ? state.compareId : state.cultureId, previous);
  if (mode === 'play' && previousSelected) {
    showDetail(previousSelected);
    enterLandmark(previousSelected, false);
  }
  if (mode !== 'play') state.localView = false;
}

function showDetail(item) {
  state.selected = item;
  const current = culture();
  $('#detail-culture').textContent = `${current.regionLabel || current.regionGroup} · ${current.localizedName?.zh || current.nativeName}`;
  const zh = constellationZh(item);
  $('#detail-native').textContent = item.nativeName;
  $('#detail-translated').textContent = [zh, item.translatedName]
    .filter((name, index, all) => name && name !== item.nativeName && all.indexOf(name) === index)
    .join(' / ');
  const mappedCount = Math.min(item.starCount, KEYBOARD_STEPS.length * 2);
  $('#keyboard-note').textContent = `键盘 / KEYBOARD · ${mappedCount} 颗星已映射 · 1–0 · Q–P · A–L · Z–M${item.starCount > KEYBOARD_STEPS.length ? ' · ⇧ 第二组' : ''}`;
  $('#detail-pronunciation').textContent = item.pronunciation || '—';
  $('#detail-stars').textContent = String(item.starCount);
  $('#detail-kind').textContent = item.kind === 'dark-region' ? '暗区 / DARK REGION' : '连线 / LINE';
  $('#detail-story-zh').textContent = current.introductionZh || '此处显示该天空文化中的一个局部结构；恒星位置保持真实，文化关系通过连线和名称呈现。';
  $('#detail-story').textContent = item.story || current.introduction || current.overview || 'Source data contains geometry and names; no separate short narrative is attached to this landmark.';
  $('#detail').hidden = false;
  $('#landmark-select').value = item.id;
  $('#status').textContent = `音乐地标 / MUSICAL LANDMARK · ${constellationLabel(item)} · ${item.starCount} 颗星 / STEPS`;
  audio.setSequence(sequenceFor(item));
}

function focusLandmark(item = state.selected) {
  if (!item) return;
  showDetail(item);
  fitConstellation(item);
  state.visualEvents.push({ type: 'enter', point: constellationPoint(item), time: performance.now() });
  $('#status').textContent = `进入 / ENTER · ${item.nativeName.toUpperCase()} · 可继续缩放或选择其他星座`;
}

function selectAdjacentLandmark(direction) {
  const items = culture().constellations.filter((item) => item.starCount > 0);
  if (!items.length) return;
  const currentIndex = Math.max(0, items.findIndex((item) => item.id === state.selected?.id));
  const next = items[(currentIndex + direction + items.length) % items.length];
  focusLandmark(next);
  if (state.mode === 'play') audio.setSequence(sequenceFor(next));
}

async function enterLandmark(item = state.selected, startSound = true) {
  if (!item) return;
  if (state.mode !== 'play') setMode('play');
  state.selected = item;
  fitConstellation(item);
  const sequence = sequenceFor(item);
  audio.setSequence(sequence);
  state.visualEvents.push({ type: 'enter', point: constellationPoint(item), time: performance.now() });
  $('#status').textContent = `ENTER · ${item.nativeName.toUpperCase()} · INSIDE LOCAL MICRO SEQUENCER`;
  if (startSound && !audio.running) await audio.start();
}

function exitLandmark() {
  if (!state.localView) return;
  const item = state.selected;
  resetView();
  state.visualEvents.push({ type: 'exit', point: item ? constellationPoint(item) : null, time: performance.now() });
  $('#status').textContent = `EXIT · ${item?.nativeName?.toUpperCase() || 'LANDMARK'} · CORRIDOR → NEXT NODE`;
}

function neighboringConstellations(item, count = 4) {
  const currentCulture = culture();
  const source = centroid(item);
  if (!source) return [];
  return currentCulture.constellations
    .filter((other) => other !== item && other.starCount)
    .map((other) => {
      const target = centroid(other);
      const dra = wrapHours(target.ra - source.ra) * 15 * Math.cos(((target.dec + source.dec) / 2) * Math.PI / 180);
      return { item: other, distance: Math.hypot(dra, target.dec - source.dec) };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map((entry) => entry.item);
}

function nextAutoLandmark() {
  if (!state.selected) {
    const first = culture().constellations.find((item) => item.starCount >= 3);
    if (first) enterLandmark(first, false);
    return;
  }
  const next = neighboringConstellations(state.selected, 1)[0];
  if (next) {
    exitLandmark();
    window.setTimeout(() => {
      showDetail(next);
      enterLandmark(next, false);
      $('#status').textContent = `AUTO ROUTE · CORRIDOR → ${next.nativeName.toUpperCase()}`;
    }, 260);
  }
}

function lineScreenPoints(line) {
  return line.map((id) => state.stars.get(id)).filter(Boolean).map((star) => starPoint(star));
}

function drawPolyline(points, alpha, lineWidth = 1) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    let x = points[i].x;
    const previous = points[i - 1].x;
    const span = width * state.view.zoom;
    if (Math.abs(x - previous) > span / 2) x += x < previous ? span : -span;
    ctx.lineTo(x, points[i].y);
  }
  ctx.strokeStyle = `rgba(189,189,189,${alpha})`;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawCultureLines(cultureId, alpha, active = false) {
  const itemCulture = culture(cultureId);
  if (!itemCulture || alpha <= 0) return;
  for (let ci = 0; ci < itemCulture.constellations.length; ci += 1) {
    const item = itemCulture.constellations[ci];
    const selected = active && state.selected?.id === item.id;
    const baseAlpha = selected ? Math.min(0.96, alpha * 1.6) : alpha * 0.23;
    for (const line of item.lines) drawPolyline(lineScreenPoints(line), baseAlpha, selected ? 1.2 : 0.7);
    if (state.guide && (selected || (state.view.zoom > 1.7 && ci % Math.max(1, Math.floor(7 / state.view.zoom)) === 0))) {
      const point = constellationPoint(item);
      if (point && point.x > -60 && point.x < width + 60 && point.y > -30 && point.y < height + 30) {
        ctx.fillStyle = `rgba(190,190,190,${selected ? 0.72 : alpha * 0.2})`;
        ctx.font = `${selected ? 9 : 7}px ui-monospace, monospace`;
        ctx.fillText(constellationLabel(item), point.x + 5, point.y - 5);
      }
    }
  }
}

function drawStars() {
  const selectedIds = new Set(state.selected?.stars || []);
  for (const star of state.data.stars) {
    const point = starPoint(star);
    if (point.x < -8 || point.x > width + 8 || point.y < -8 || point.y > height + 8) continue;
    const selected = selectedIds.has(star.id);
    const cultural = state.visibleStarIds.has(star.id);
    const stepIndex = selected ? audio.sequence.findIndex((entry) => entry.id === star.id) : -1;
    const active = selected && ((state.activeStep >= 0 && stepIndex === state.activeStep) || state.keyboardHeld.has(stepIndex));
    const radius = active ? 4.2 : selected ? 3.3 : cultural
      ? clamp(2.9 - (star.mag + 1) * 0.18, 1.45, 2.55)
      : clamp(2.05 - (star.mag + 1) * 0.13, 0.9, 1.55);
    if (selected || star.mag < 3.2) {
      const glow = selected ? 5.4 : 3.3 + (3.2 - star.mag) * 0.75;
      const glowAlpha = selected ? 0.2 : cultural ? 0.11 : 0.055;
      ctx.fillStyle = `rgba(220,220,220,${glowAlpha})`;
      ctx.beginPath(); ctx.arc(point.x, point.y, glow, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = active ? '#ffffff' : selected ? '#eeeeee' : cultural ? '#a0a0a0' : '#626262';
    ctx.fillRect(point.x - radius / 2, point.y - radius / 2, radius, radius);
    const binding = selected && state.localView ? keyboardBinding(stepIndex) : null;
    if (binding) {
      ctx.font = '7px ui-monospace, monospace';
      const labelWidth = binding.label.startsWith('⇧') ? 16 : 10;
      const labelX = point.x + 5;
      const labelY = point.y - 5;
      ctx.fillStyle = active ? 'rgba(242,242,242,.92)' : 'rgba(189,189,189,.48)';
      ctx.fillText(binding.label, labelX, labelY);
      ctx.strokeStyle = active ? 'rgba(242,242,242,.48)' : 'rgba(189,189,189,.16)';
      ctx.strokeRect(labelX - 2, labelY - 8, labelWidth, 11);
    }
    if (active) {
      ctx.strokeStyle = 'rgba(242,242,242,.34)';
      ctx.beginPath(); ctx.arc(point.x, point.y, 8 + (frame % 24), 0, Math.PI * 2); ctx.stroke();
    }
  }
}

function drawOverview() {
  const ow = overviewCanvas.width;
  const oh = overviewCanvas.height;
  overviewCtx.fillStyle = '#030303';
  overviewCtx.fillRect(0, 0, ow, oh);
  overviewCtx.fillStyle = '#555';
  for (const id of state.visibleStarIds) {
    const star = state.stars.get(id);
    if (!star) continue;
    const x = (star.ra / 24) * ow;
    const y = (0.5 - star.dec / 180) * oh;
    overviewCtx.fillRect(x, y, star.mag < 3 ? 2 : 1, star.mag < 3 ? 2 : 1);
  }
  if (state.selected) {
    overviewCtx.fillStyle = '#f2f2f2';
    for (const id of state.selected.stars) {
      const star = state.stars.get(id);
      if (!star) continue;
      overviewCtx.fillRect((star.ra / 24) * ow - 1, (0.5 - star.dec / 180) * oh - 1, 3, 3);
    }
  }
  const effectiveRa = ((state.view.centerRa - (state.view.panX / (Math.max(1, width) * state.view.zoom)) * 24) % 24 + 24) % 24;
  const effectiveDec = clamp(state.view.centerDec + (state.view.panY / (Math.max(1, height) * state.view.zoom)) * 180, -90, 90);
  const rectWidth = ow / state.view.zoom;
  const rectHeight = oh / state.view.zoom;
  const rectX = (effectiveRa / 24) * ow - rectWidth / 2;
  const rectY = (0.5 - effectiveDec / 180) * oh - rectHeight / 2;
  overviewCtx.strokeStyle = 'rgba(242,242,242,.65)';
  overviewCtx.lineWidth = 2;
  overviewCtx.strokeRect(rectX, rectY, rectWidth, rectHeight);
}

function drawMicroSequencer() {
  if (!state.localView || !state.selected || !audio.sequence.length) return;
  const steps = audio.sequence;
  const cell = clamp((width - 60) / Math.max(steps.length, 12), 2.2, 7);
  const gap = 1.8;
  const total = steps.length * (cell + gap) - gap;
  const startX = width / 2 - total / 2;
  const y = height - 88;
  for (let i = 0; i < steps.length; i += 1) {
    const star = steps[i];
    const strength = clamp(1 - (star.mag + 1) / 8, 0.12, 0.8);
    ctx.fillStyle = i === state.activeStep ? '#f2f2f2' : `rgba(189,189,189,${strength})`;
    ctx.fillRect(startX + i * (cell + gap), y, cell, cell * (0.45 + strength));
  }
  if (state.guide) {
    ctx.fillStyle = 'rgba(255,255,255,.24)';
    ctx.font = '7px ui-monospace, monospace';
    ctx.fillText('LOCAL MICRO SEQUENCER · MAGNITUDE → VELOCITY · DISTANCE → INTERVAL', startX, y + 22);
  }
}

function drawCorridors() {
  if (state.mode !== 'play' || !state.selected || state.localView) return;
  const from = constellationPoint(state.selected);
  if (!from) return;
  for (const next of neighboringConstellations(state.selected)) {
    const to = constellationPoint(next);
    if (!to) continue;
    ctx.strokeStyle = 'rgba(189,189,189,.12)';
    ctx.setLineDash([3, 7]);
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(189,189,189,.32)';
    ctx.fillRect(to.x - 1.5, to.y - 1.5, 3, 3);
  }
}

function drawEvents(now) {
  state.visualEvents = state.visualEvents.filter((event) => now - event.time < 1600);
  for (const event of state.visualEvents) {
    if (!event.point) continue;
    const age = (now - event.time) / 1600;
    const alpha = (1 - age) * (event.type === 'enter' ? 0.32 : 0.18);
    ctx.strokeStyle = `rgba(242,242,242,${alpha})`;
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath(); ctx.arc(event.point.x, event.point.y, 20 + age * (100 + ring * 90), 0, Math.PI * 2); ctx.stroke();
    }
  }
}

function draw(now) {
  frame += 1;
  ctx.fillStyle = state.localView ? 'rgba(2,2,2,.23)' : '#020202';
  ctx.fillRect(0, 0, width, height);
  if (state.transition) {
    const progress = clamp((now - state.transition.started) / state.transition.duration, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    drawCultureLines(state.transition.from, 1 - eased, false);
    drawCultureLines(state.transition.to, eased, true);
    if (progress >= 1) state.transition = null;
  } else drawCultureLines(state.visibleCultureId, 1, true);
  drawStars();
  drawCorridors();
  drawMicroSequencer();
  drawEvents(now);
  if (frame % 3 === 0) drawOverview();
  requestAnimationFrame(draw);
}

function distanceToSegment(point, a, b) {
  const vx = b.x - a.x; const vy = b.y - a.y;
  const l2 = vx * vx + vy * vy || 1;
  const t = clamp(((point.x - a.x) * vx + (point.y - a.y) * vy) / l2, 0, 1);
  return Math.hypot(point.x - (a.x + t * vx), point.y - (a.y + t * vy));
}

function hitConstellation(x, y) {
  let best = null; let bestDistance = 26;
  const current = culture();
  for (const item of current.constellations) {
    for (const line of item.lines) {
      const points = lineScreenPoints(line);
      for (let i = 1; i < points.length; i += 1) {
        const distance = distanceToSegment({ x, y }, points[i - 1], points[i]);
        if (distance < bestDistance) { best = item; bestDistance = distance; }
      }
    }
    const point = constellationPoint(item);
    if (point) {
      const distance = Math.hypot(x - point.x, y - point.y);
      if (distance < bestDistance) { best = item; bestDistance = distance; }
    }
  }
  return best;
}

function hitSequenceStar(x, y) {
  if (!state.selected) return null;
  let best = null; let distance = 14;
  for (let i = 0; i < audio.sequence.length; i += 1) {
    const point = starPoint(audio.sequence[i]);
    const next = Math.hypot(x - point.x, y - point.y);
    if (next < distance) { distance = next; best = { step: audio.sequence[i], index: i, point }; }
  }
  return best;
}

stage.addEventListener('pointerdown', (event) => {
  stage.setPointerCapture(event.pointerId);
  const star = state.mode === 'play' && state.localView ? hitSequenceStar(event.clientX, event.clientY) : null;
  state.pointer = {
    id: event.pointerId, x: event.clientX, y: event.clientY,
    startX: event.clientX, startY: event.clientY, moved: false,
    playing: Boolean(star), lastStar: null,
  };
  if (star) {
    state.pointer.lastStar = star.step.id;
    state.activeStep = star.index;
    audio.audition(star.step, star.index);
    $('#status').textContent = `INSIDE · STEP ${star.index + 1}/${audio.sequence.length} · HIP ${star.step.id}`;
  }
});

stage.addEventListener('pointermove', (event) => {
  const pointer = state.pointer;
  if (!pointer || pointer.id !== event.pointerId) return;
  const dx = event.clientX - pointer.x; const dy = event.clientY - pointer.y;
  if (Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 4) pointer.moved = true;
  if (pointer.playing) {
    const star = hitSequenceStar(event.clientX, event.clientY);
    if (star && star.step.id !== pointer.lastStar) {
      pointer.lastStar = star.step.id;
      state.activeStep = star.index;
      audio.audition(star.step, star.index);
      state.trail.push({ x: star.point.x, y: star.point.y, time: performance.now() });
      $('#status').textContent = `INSIDE · PATH STEP ${star.index + 1}/${audio.sequence.length} · HIP ${star.step.id}`;
    }
  } else {
    state.view.panX += dx;
    state.view.panY += dy;
    state.localView = state.view.zoom > 1.05;
  }
  pointer.x = event.clientX; pointer.y = event.clientY;
});

stage.addEventListener('pointerup', (event) => {
  const pointer = state.pointer;
  if (!pointer || pointer.id !== event.pointerId) return;
  if (!pointer.moved && !pointer.playing) {
    const item = hitConstellation(event.clientX, event.clientY);
    if (item) {
      if (state.mode === 'play' && state.selected && !state.localView) {
        const allowed = neighboringConstellations(state.selected).includes(item) || item === state.selected;
        if (!allowed) {
          $('#status').textContent = `NO EDGE · ${state.selected.nativeName.toUpperCase()} → ${item.nativeName.toUpperCase()}`;
          state.pointer = null;
          return;
        }
      }
      if (state.mode === 'play') {
        showDetail(item);
        enterLandmark(item, true);
      } else focusLandmark(item);
    }
  }
  if (pointer.playing) $('#status').textContent = `EXIT GESTURE · ${state.selected?.nativeName?.toUpperCase() || ''} · RELEASE`;
  state.pointer = null;
});

stage.addEventListener('pointercancel', () => { state.pointer = null; });
stage.addEventListener('dblclick', (event) => {
  const item = hitConstellation(event.clientX, event.clientY);
  if (item) {
    if (state.mode === 'play') { showDetail(item); enterLandmark(item, true); }
    else focusLandmark(item);
  }
});
stage.addEventListener('wheel', (event) => {
  event.preventDefault();
  const before = state.view.zoom;
  state.view.zoom = clamp(state.view.zoom * Math.exp(-event.deltaY * 0.0012), 0.65, 12);
  const ratio = state.view.zoom / before;
  state.view.panX = event.clientX - width / 2 - (event.clientX - width / 2 - state.view.panX) * ratio;
  state.view.panY = event.clientY - height / 2 - (event.clientY - height / 2 - state.view.panY) * ratio;
  state.localView = state.view.zoom > 1.05;
  updateViewReadout();
}, { passive: false });

overviewCanvas.addEventListener('click', (event) => {
  const bounds = overviewCanvas.getBoundingClientRect();
  const nx = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
  const ny = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
  state.view.centerRa = nx * 24;
  state.view.centerDec = (0.5 - ny) * 180;
  state.view.panX = 0;
  state.view.panY = 0;
  state.localView = state.view.zoom > 1.05;
  $('#status').textContent = `全图定位 / OVERVIEW POSITION · RA ${state.view.centerRa.toFixed(1)}h · DEC ${state.view.centerDec.toFixed(1)}°`;
});

function openDrawer(purpose = 'primary') {
  state.drawerPurpose = purpose;
  refreshGrids();
  $('#drawer').hidden = false;
  $('#culture-menu').setAttribute('aria-expanded', 'true');
}

function closeDrawer() {
  $('#drawer').hidden = true;
  $('#culture-menu').setAttribute('aria-expanded', 'false');
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => document.body.classList.toggle('stage-mode'));
}

function showOverlay(type) {
  const body = $('#overlay-body');
  $('#overlay-title').textContent = type === 'about' ? '关于 / ABOUT' : '署名与来源 / CREDITS / SOURCES';
  if (type === 'about') {
    body.innerHTML = `
      <h1>ONE SKY,<br>MANY WORLDS</h1>
      <p>《星图演奏》把同一批真实恒星视为多种关系系统，而不是把任何一种星座边界当成唯一答案。ATLAS 用于阅读；PLAY 把星点、线段、星等和距离变成局部音序；COMPARE 固定恒星位置，只让文化连线断开并重新形成。</p>
      <h2>演奏模型 / PLAYING MODEL</h2>
      <p>每个星座或星官都是一个音乐地标：恒星成为音序步骤，星等影响力度，角距离影响时间间隔。Every constellation or asterism is a musical landmark. Stars become steps, apparent magnitude affects velocity, and angular distance affects interval length.</p>
      <h2>非连线结构 / NON-LINE STRUCTURES</h2>
      <p>数据模型保留暗区、地平线门、月宿路径、宫墙、地景对应和时间周期。The data model preserves dark regions, horizon gates, lunar paths, enclosures, landscape correspondences and time cycles.</p>
      <h2>原作 / ORIGINAL WORK</h2>
      <p><strong>Based on D5 v13 — Sequencer Map by Ewan Qian / 钱誉文.<br>Original code used and modified under the MIT License.</strong></p>`;
  } else {
    const entries = state.data.cultures.map((item) => `
      <div class="credit-entry">
        <strong>${escapeHtml(item.nativeName)}</strong>
        <span>${escapeHtml(item.authors || 'Authors listed in upstream description.md')}<br><br>LICENSE: ${escapeHtml(item.license || 'See upstream description.md')}<br>SOURCE: ${escapeHtml(item.sourceFiles.join(' · '))}<br>ILLUSTRATIONS: NOT BUNDLED</span>
      </div>`).join('');
    body.innerHTML = `
      <h1>CREDITS /<br>SOURCES</h1>
      <p><strong>Based on D5 v13 — Sequencer Map by Ewan Qian / 钱誉文.<br>Original code used and modified under the MIT License.</strong></p>
      <h2>AUDIO</h2>
      <p>Audio is generated in real time by <code>public/atlas/audio-engine.js</code>, derived from the D5 v12 runtime and v13 patch. It uses Web Audio oscillators, filtered procedural noise, gain envelopes, stereo panning and dynamics compression. No WAV, MP3, sample pack or third-party recording is bundled.</p>
      <h2>ASTRONOMICAL POSITIONS</h2>
      <p>Hipparcos identifiers come from Stellarium sky-culture geometry. J2000-aligned star positions and apparent magnitudes are adapted from the Astronexus HYG Database v4.1 under CC BY-SA 4.0.</p>
      <h2>SKY CULTURES</h2>
      <p>Culture geometry, names and texts are adapted from Stellarium/stellarium-skycultures. Each culture retains its own authors and license below. No illustration is included in this build.</p>
      ${entries}`;
  }
  $('#overlay').hidden = false;
}

audio.addEventListener('state', (event) => {
  const running = event.detail.running;
  $('#play').textContent = running ? '停止 STOP' : '播放 PLAY';
  $('#play').classList.toggle('on', running);
  if (event.detail.panic) $('#status').textContent = '紧急停止 / PANIC · 音频与路径已清除';
});

audio.addEventListener('step', (event) => {
  state.activeStep = event.detail.index;
  if (state.auto && event.detail.index === 0 && event.detail.tick > 0) {
    state.autoLoops += 1;
    if (state.autoLoops >= 2) { state.autoLoops = 0; nextAutoLandmark(); }
  }
});

$('#play').addEventListener('click', async () => {
  if (!audio.sequence.length) {
    const first = state.selected || culture().constellations.find((item) => item.starCount >= 3);
    if (first) { showDetail(first); audio.setSequence(sequenceFor(first)); }
  }
  const running = await audio.toggle();
  $('#status').textContent = running ? `演奏中 / PLAYING · ${BPM} BPM · ${state.selected?.nativeName?.toUpperCase() || 'ATLAS'}` : '已停止 / STOPPED';
});

$('#auto').addEventListener('click', async () => {
  state.auto = !state.auto;
  $('#auto').classList.toggle('on', state.auto);
  $('#auto').textContent = state.auto ? '自动开启 AUTO ON' : '自动路径 AUTO ROUTE';
  if (state.auto) {
    if (!state.selected) nextAutoLandmark();
    if (!audio.running) await audio.start();
    $('#status').textContent = '自动路径 / AUTO ROUTE · ENTER → INSIDE → EXIT → CORRIDOR → NEXT NODE';
  }
});

$('#guide').addEventListener('click', () => {
  state.guide = !state.guide;
  document.body.classList.toggle('guide-off', !state.guide);
  $('#guide').textContent = state.guide ? '引导开启 GUIDE ON' : '引导关闭 GUIDE OFF';
  $('#guide').classList.toggle('on', state.guide);
});
$('#panic').addEventListener('click', () => {
  state.auto = false; state.autoLoops = 0; state.activeStep = -1;
  $('#auto').classList.remove('on'); $('#auto').textContent = '自动路径 AUTO ROUTE';
  audio.panic();
});
$('#fullscreen').addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', () => {
  const active = Boolean(document.fullscreenElement);
  $('#fullscreen').textContent = active ? '退出全屏 EXIT FULLSCREEN' : '全屏 FULLSCREEN';
  $('#fullscreen').classList.toggle('on', active);
  window.setTimeout(resize, 50);
});

$$('.mode').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
$('#culture-menu').addEventListener('click', () => openDrawer('primary'));
$('#compare-culture').addEventListener('click', () => openDrawer('compare'));
$('#drawer-close').addEventListener('click', closeDrawer);
$('#detail-close').addEventListener('click', () => { $('#detail').hidden = true; });
$('#enter-landmark').addEventListener('click', () => focusLandmark(state.selected));
$('#play-landmark').addEventListener('click', async () => {
  if (state.selected) audio.setSequence(sequenceFor(state.selected));
  if (!audio.running) await audio.start();
});
$('#previous-landmark').addEventListener('click', () => selectAdjacentLandmark(-1));
$('#next-landmark').addEventListener('click', () => selectAdjacentLandmark(1));
$('#zoom-out').addEventListener('click', () => zoomBy(0.8));
$('#zoom-in').addEventListener('click', () => zoomBy(1.25));
$('#focus-landmark').addEventListener('click', () => focusLandmark(state.selected));
$('#reset-view').addEventListener('click', () => {
  resetView();
  $('#status').textContent = '返回整张星图 / RETURNED TO ALL-SKY VIEW';
});
$('#landmark-select').addEventListener('change', (event) => {
  const item = culture().constellations.find((entry) => entry.id === event.target.value);
  if (!item) return;
  if (state.mode === 'play') { showDetail(item); enterLandmark(item, false); }
  else focusLandmark(item);
});
$('#home').addEventListener('click', () => {
  audio.stop();
  $('#shell').hidden = true;
  $('#launch').hidden = false;
  state.launchSelected = state.cultureId;
  refreshGrids();
});
$$('[data-overlay]').forEach((button) => button.addEventListener('click', () => showOverlay(button.dataset.overlay)));
$('#overlay-close').addEventListener('click', () => { $('#overlay').hidden = true; });

document.addEventListener('keydown', (event) => {
  const editable = event.target.matches?.('input, textarea, select, [contenteditable="true"]');
  if (!editable && !event.metaKey && !event.ctrlKey && !event.altKey && !event.repeat && $('#launch').hidden && $('#overlay').hidden && $('#drawer').hidden) {
    const index = keyboardStepIndex(event);
    if (index >= 0) {
      event.preventDefault();
      const step = audio.sequence[index];
      state.keyboardHeld.add(index);
      state.activeStep = index;
      audio.audition(step, index);
      $('#status').textContent = `键盘演奏 / KEYBOARD · ${keyboardBinding(index).label} · STEP ${index + 1}/${audio.sequence.length} · HIP ${step.id}`;
      return;
    }
  }
  if (event.key === 'Escape') {
    if (!$('#overlay').hidden) $('#overlay').hidden = true;
    else if (!$('#drawer').hidden) closeDrawer();
    else if (state.localView) exitLandmark();
    return;
  }
  if (event.key.toLowerCase() === 'f' && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault(); toggleFullscreen();
  }
  if (event.code === 'Space' && !event.repeat && event.target.tagName !== 'BUTTON') {
    event.preventDefault(); $('#play').click();
  }
});

document.addEventListener('keyup', (event) => {
  const base = KEYBOARD_STEPS.findIndex(([code]) => code === event.code);
  if (base < 0) return;
  state.keyboardHeld.delete(base);
  state.keyboardHeld.delete(base + KEYBOARD_STEPS.length);
  if (!audio.running && state.keyboardHeld.size === 0) state.activeStep = -1;
});

async function init() {
  try {
    const response = await fetch('/data/sky-cultures.json');
    if (!response.ok) throw new Error(`Data request failed: ${response.status}`);
    state.data = await response.json();
    state.stars = new Map(state.data.stars.map((item) => [item.id, item]));
    state.cultures = new Map(state.data.cultures.map((item) => [item.id, item]));
    state.visibleCultureId = state.cultureId;
    state.visibleStarIds = new Set(culture().stars);
    $('#data-count').textContent = `${state.data.cultures.length} 套文化 / CULTURES · ${state.data.stars.length.toLocaleString()} 颗 HIP 恒星 / STARS`;
    refreshGrids();
    resize();
    $('#loading').hidden = true;
    requestAnimationFrame(draw);
  } catch (error) {
    $('#loading').textContent = `DATA ERROR · ${error.message}`;
    console.error(error);
  }
}

window.addEventListener('resize', resize);
init();
