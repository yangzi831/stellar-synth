import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync(new URL('../public/data/sky-cultures.json', import.meta.url), 'utf8'));
const html = fs.readFileSync(new URL('../public/atlas/index.html', import.meta.url), 'utf8');
const publicIndex = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const audio = fs.readFileSync(new URL('../public/atlas/audio-engine.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../public/atlas/app.js', import.meta.url), 'utf8');
const sampleManifest = JSON.parse(fs.readFileSync(new URL('../public/audio/culture-samples.json', import.meta.url), 'utf8'));
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
for (const arrangement of ['path', 'group', 'fragment']) {
  assert(html.includes(`data-arrangement="${arrangement}"`), `Missing arrangement mode: ${arrangement}`);
}
for (const performance of ['star', 'loop']) {
  assert(html.includes(`data-performance="${performance}"`), `Missing keyboard mode: ${performance}`);
}
for (let scene = 0; scene <= 9; scene += 1) {
  assert(html.includes(`data-scene="${scene}"`), `Missing Scene control: ${scene}`);
}
assert(audio.includes('export const BPM = 123'), 'Audio engine must run at the 123 BPM deep-techno reference tempo.');
assert(audio.includes('const GROOVE_STEPS = 16'), 'Dance groove must use a fixed 4/4 sixteen-step bar.');
assert(audio.includes('createDynamicsCompressor'), 'D5 dynamics path is missing.');
assert(audio.includes('this.limiter'), 'Final output limiter is missing.');
assert(audio.includes('const MASTER_GAIN = 1.9'), 'Raised master level is missing.');
assert(audio.includes('const MAKEUP_GAIN = 1.75'), 'Output makeup stage is missing.');
assert(audio.includes('this.limiter.threshold.value = -1'), 'Limiter ceiling must remain near -1 dBFS.');
assert(audio.includes('const MUSIC_GAIN = 1.34'), 'Foreground musical arrangement bus is missing.');
assert(audio.includes('const DRUM_GAIN = 0.52'), 'Controlled drum bus level is missing.');
assert(audio.includes("this.reverbHighpass.type = 'highpass'"), 'Reverb input must remove low-frequency mud.');
assert(audio.includes('this.reverbPreDelay.delayTime.value'), 'Reverb must preserve dry attacks with pre-delay.');
assert(audio.includes('const GROOVE_TEMPLATES = ['), 'Curated shared GrooveTemplates are missing.');
assert(!audio.includes('while (this.nextTick'), 'A free-running StarEvent clock must not compete with the shared groove clock.');
assert(audio.includes('motifSlots:') && audio.includes('constellationSlots:'), 'GrooveTemplates must reserve shared motif and constellation event pockets.');
assert(audio.includes('scheduleConstellationEventLane('), 'Star events must be locked to the shared arrangement clock.');
assert(audio.includes('this.constellationGroove.motifSlots'), 'Constellation motifs must read the shared GrooveTemplate slots.');
assert(audio.includes('this.constellationGroove.constellationSlots'), 'PATH/GROUP/FRAGMENT events must read the shared GrooveTemplate slots.');
assert(audio.includes('const MANUAL_GAIN = 1.95'), 'Foreground ManualPerformanceBus level is missing.');
assert(audio.includes('const BED_GAIN = 0.105'), 'Subtle Cosmic Bed bus level is missing.');
assert(audio.includes('createOscillator'), 'Synthesis oscillator path is missing.');
assert(audio.includes('const HOLD_THRESHOLD_MS = 350'), 'The 350ms hold threshold is missing.');
assert(audio.includes('const TWO_BARS = BEAT * 8'), 'Two-bar parameter cadence is missing.');
assert(audio.includes('createConvolver'), 'Synthetic reverb tail is missing.');
for (const method of ['starInstrumentAttack', 'gestureInstrumentTone', 'gestureMallet', 'gesturePulse', 'gestureGrain', 'releaseTail', 'clockSnapshot']) {
  assert(audio.includes(`${method}(`), `Missing gesture audio stage: ${method}`);
}
for (const method of ['triggerStarEvent', 'selectEventVoices', 'profileChord']) {
  assert(audio.includes(`${method}(`), `Missing grouped event audio stage: ${method}`);
}
for (const method of ['createTrackLanes', 'queueTrackVariant', 'updateArrangementDirector', 'visualMusicState', 'releaseTrackOverride', 'queueScene', 'applyScene', 'createMusicalPatterns']) {
  assert(audio.includes(`${method}(`), `Missing arrangement engine stage: ${method}`);
}
for (const section of ['intro', 'groove-a', 'groove-b', 'bass-drive', 'synth-build', 'melodic-open', 'break', 'peak-return', 'outro-experiment']) {
  assert(audio.includes(section), `Missing Scene: ${section}`);
}
for (const cultureId of ['chinese', 'western', 'indian', 'northern_andes']) {
  assert(audio.includes(`${cultureId}: {`), `Missing CultureMusicProfile: ${cultureId}`);
}
for (const stage of ['buildStarEvents', 'topologyGroups', 'drawStarEventVisuals', 'setArrangementMode']) {
  assert(app.includes(`${stage}(`), `Missing grouped composition stage: ${stage}`);
}
for (const stage of ['extractMusicalControlNodes', 'setPerformanceMode', 'ParticleField', 'launchScene', 'startGuidedLoop']) {
  assert(app.includes(stage), `Missing interactive arrangement/particle stage: ${stage}`);
}
for (const method of ['startGuidedLoop', 'beginLoopStage', 'recordLoopInput', 'scheduleLoopPlayback', 'playLoopEvent', 'redoCurrentLoopLayer']) {
  assert(audio.includes(`${method}(`), `Missing guided Loop stage: ${method}`);
}
for (const method of ['currentTransportPosition', 'performanceKick', 'performanceHat', 'prioritizeManualVoices', 'connectBed', 'connectPercussion']) {
  assert(audio.includes(`${method}(`), `Missing v0.5 playability stage: ${method}`);
}
for (const control of ['loop-keys', 'loop-redo', 'loop-redo-layer', 'loop-stop', 'loop-panic', 'loop-exit']) {
  assert(html.includes(`id="${control}"`), `Missing guided Loop control: ${control}`);
}
assert((html.match(/<i><\/i>/g) || []).length >= 32, 'Guided Loop must render CURRENT and NEXT 16-beat rows.');
assert(html.includes('id="loop-entry"'), 'Primary LOOP entry is missing.');
assert(html.includes('Q — KICK') && html.includes('W — HI-HAT'), 'Stable Q/W rhythm controls are missing.');
const playKeyboardBlock = app.slice(app.indexOf('const KEYBOARD_STEPS'), app.indexOf('const LOOP_KEYBOARD_STEPS'));
assert(!playKeyboardBlock.includes("['KeyQ', 'Q']") && !playKeyboardBlock.includes("['KeyW', 'W']"), 'Q/W must not remain in the PLAY Star keyboard mapping.');
assert(app.includes("event.code === 'KeyQ'") && app.includes("event.code === 'KeyW'"), 'Global Q/W rhythm keyboard handlers are missing.');
assert(app.includes('const LOOP_KEYBOARD_STEPS'), 'LOOP must use a dedicated all-letter keyboard map.');
assert(app.includes("['KeyQ', 'Q'], ['KeyW', 'W'], ['KeyE', 'E']"), 'LOOP must include Q/W as current-layer instrument keys.');
assert(app.indexOf("state.performanceMode === 'loop'") < app.indexOf("state.performanceMode !== 'loop' && audio.sequence.length"), 'LOOP routing must run before PLAY-only Q/W drums.');
assert(html.includes('ALL LETTER KEYS = CURRENT INSTRUMENT'), 'LOOP performance view must explain stage-owned keys.');
assert(app.includes('pointer.loopRecording'), 'Pointer star input must route through the current LOOP stage.');
assert(app.includes("loop.stage?.id === 'drums'"), 'Only the DRUM stage may assign Q/W drum roles inside LOOP.');
assert(app.includes('requestedIndex % audio.sequence.length'), 'Every displayed Star key must wrap to an audible star.');
assert(app.includes('showPerformanceHit('), 'Immediate performance feedback overlay is missing.');
assert(audio.includes("options.role === 'kick' ? 4"), 'Kick quantization must use a one-beat grid.');
assert(audio.includes("options.role === 'hat' ? 2"), 'Hi-hat quantization must use a half-beat grid.');
assert(audio.includes('session.loopOriginStep'), 'Guided Loop layers must share one transport origin.');
assert(audio.includes('dispatchLoopState(stepNumber, time)'), 'Loop UI must read the same scheduled transport step as audio.');
assert(audio.includes('session.displayPosition'), 'Loop UI must keep scheduled transport display monotonic while recording.');
assert(audio.includes('(audioTime - this.context.currentTime) * 1000'), 'Loop UI changes must be dispatched at the audible Web Audio time.');
assert(audio.includes('transportStep < session.stageStartStep'), 'Guided Loop must reject input from the scheduler look-ahead window.');
assert(audio.includes('session.pendingOriginStep = recordStart'), 'REDO must schedule a prompt shared bar-zero restart.');
assert(audio.includes('session.uiRevision !== revision'), 'Stale scheduled Loop UI events must not overwrite STOP/REDO state.');
assert(audio.includes('completedLabels:'), 'Loop UI must expose user-facing layer names.');
assert(audio.includes("new CustomEvent('loop-playback'"), 'Loop must expose actual cumulative layer playback for verification.');
assert(audio.includes('session.playbackCounts[id]'), 'Completed layer playback must be counted after it is audibly scheduled.');
assert(audio.includes("this.markTrack('drums', time, 0.52, 'metal-perc'"), 'Every DRUM-stage key must remain percussion.');
assert(audio.includes('resting: []'), 'Guided Loop must preserve empty stages as intentional rests.');
assert(app.includes('EMPTY STAGES BECOME REST'), 'Guided Loop must explain empty-stage rest behaviour.');
for (const recipe of ['analog-pluck', 'saw-sequence', 'acid-resonant', 'soft-poly', 'dark-pulse', 'fm-metallic']) {
  assert(audio.includes(recipe), `Missing stable synth recipe: ${recipe}`);
}
assert(!/\['Digit1',\s*'1'\]/.test(app), 'Number keys must not be part of Star keyboard mapping.');
assert(app.includes("/^Digit[0-9]$/.test(event.code)"), 'Number row Scene mapping is missing.');
assert(sampleManifest.bundledRecordings === false, 'Sample manifest must not claim bundled recordings.');
for (const cultureId of ['chinese', 'western', 'indian']) assert(sampleManifest.cultures[cultureId], `Missing sample slots for ${cultureId}.`);
assert(app.includes('audio.visualMusicState()'), 'Particles must read the shared musical state.');
assert(audio.includes("new CustomEvent('star-event'"), 'Audio and visual grouped events must share StarEvent timing.');
for (const visual of ['drawGestureVisuals', 'spawnTopologyNode', 'drawLiquidConnection']) {
  assert(app.includes(`${visual}(`), `Missing gesture visual stage: ${visual}`);
}
for (const compareStage of ['matchingCompareLandmark', 'switchCompareCulture', 'queueCompareSwitch', 'updateCompareCopy']) {
  assert(app.includes(`${compareStage}(`), `Missing alternating compare stage: ${compareStage}`);
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
