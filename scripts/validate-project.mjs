import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync(new URL('../public/data/sky-cultures.json', import.meta.url), 'utf8'));
const html = fs.readFileSync(new URL('../public/atlas/index.html', import.meta.url), 'utf8');
const publicIndex = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const audio = fs.readFileSync(new URL('../public/atlas/audio-engine.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../public/atlas/app.js', import.meta.url), 'utf8');
const starIds = new Set(data.stars.map((star) => star.id));
const cultures = new Map(data.cultures.map((culture) => [culture.id, culture]));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(data.cultures.length >= 3, 'At least three cultures are required.');
for (const id of ['chinese', 'western', 'maori']) assert(cultures.has(id), `Missing required culture: ${id}`);
assert(cultures.get('chinese').localizedName?.zh === '中国传统星空', 'Chinese localization is missing.');
assert(JSON.stringify(cultures.get('chinese').lines) !== JSON.stringify(cultures.get('western').lines), 'Chinese and Western geometry must differ.');
assert(!cultures.has('arabic_lunar_stations'), 'ND-licensed Arabic transformed data must not be loaded.');
assert(!cultures.has('kamilaroi'), 'ND-licensed Kamilaroi transformed data must not be loaded.');

for (const culture of data.cultures) {
  assert(culture.authors, `${culture.id} is missing authors.`);
  assert(culture.license, `${culture.id} is missing a license.`);
  for (const constellation of culture.constellations) {
    assert(constellation.localizedName?.zh, `${culture.id}/${constellation.id} is missing a Chinese display name.`);
    assert(!constellation.localizedName.zh.startsWith('中文名：'), `${culture.id}/${constellation.id} still uses a Chinese-name fallback.`);
  }
  for (const line of culture.lines) {
    for (const hip of line) assert(starIds.has(hip), `${culture.id} references missing HIP ${hip}.`);
  }
}

for (const label of ['ATLAS', 'PLAY', 'COMPARE', 'AUTO ROUTE', 'FULLSCREEN', 'PANIC']) {
  assert(html.includes(label), `Missing interface control: ${label}`);
}
for (const control of ['zoom-in', 'zoom-out', 'reset-view', 'landmark-select', 'overview']) {
  assert(html.includes(`id="${control}"`), `Missing navigation control: ${control}`);
}
assert(audio.includes('export const BPM = 150'), 'Audio engine must run at 150 BPM.');
assert(audio.includes('createDynamicsCompressor'), 'D5 dynamics path is missing.');
assert(audio.includes('this.limiter'), 'Final output limiter is missing.');
assert(audio.includes('const MASTER_GAIN = 0.95'), 'Raised master level is missing.');
assert(audio.includes('createOscillator'), 'Synthesis oscillator path is missing.');
assert(audio.includes('const HOLD_THRESHOLD_MS = 350'), 'The 350ms hold threshold is missing.');
assert(audio.includes('const TWO_BARS = BEAT * 8'), 'Two-bar parameter cadence is missing.');
assert(audio.includes('createConvolver'), 'Synthetic reverb tail is missing.');
for (const method of ['filteredPluck', 'gesturePulse', 'gestureGrain', 'releaseTail', 'clockSnapshot']) {
  assert(audio.includes(`${method}(`), `Missing gesture audio stage: ${method}`);
}
for (const visual of ['drawGestureVisuals', 'spawnTopologyNode', 'drawLiquidConnection']) {
  assert(app.includes(`${visual}(`), `Missing gesture visual stage: ${visual}`);
}
assert(app.includes('audio.interactionSnapshot(id)'), 'Audio and visuals must share interaction state.');
assert(app.includes("fetch('../data/sky-cultures.json')"), 'Sky-culture data must use a GitHub Pages-compatible relative path.');
assert(publicIndex.includes('./atlas/'), 'Static root must enter the standalone atlas.');
for (const line of ['Stellar Synth', '星宿频率', 'Play the Stars Across Cultures', '演奏不同文明眼中的星空']) {
  assert(html.includes(line), `Missing required launch title line: ${line}`);
}
assert(html.includes('<title>Stellar Synth | 星宿频率</title>'), 'Browser title is not updated.');
assert(/\.launch-title h1[^}]*text-transform:\s*none/.test(fs.readFileSync(new URL('../public/atlas/app.css', import.meta.url), 'utf8')), 'English launch title must preserve title case.');
assert(!/\.(wav|mp3|ogg|flac)/i.test(audio), 'Audio engine unexpectedly references a sample file.');

console.log(`Validated ${data.cultures.length} cultures, ${data.stars.length} stars, fixed-position compare geometry and synthesis-only audio.`);
