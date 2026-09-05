/*
 * User-provided MP3 instrument catalogue.
 *
 * The catalogue owns only mapping and gain policy. SamplePlayer owns Web Audio
 * loading/routing, so adding another culture never touches star components or
 * the sequencer's musical grammar.
 */
const INSTRUMENT_LIBRARY = Object.freeze({
  china: Object.freeze([
    Object.freeze({ id: 'china-01', file: '../audio/instruments/china-01.mp3', gain: 0.048, reverb: 0.2 }),
    Object.freeze({ id: 'china-02', file: '../audio/instruments/china-02.mp3', gain: 0.048, reverb: 0.2 }),
    Object.freeze({ id: 'china-03', file: '../audio/instruments/china-03.mp3', gain: 0.048, reverb: 0.2 }),
    Object.freeze({ id: 'china-04', file: '../audio/instruments/china-04.mp3', gain: 0.048, reverb: 0.2 }),
  ]),
  navajo: Object.freeze([
    Object.freeze({ id: 'navajo-01', file: '../audio/instruments/navajo-01.mp3', gain: 0.07, reverb: 0.24 }),
    Object.freeze({ id: 'navajo-02', file: '../audio/instruments/navajo-02.mp3', gain: 0.075, reverb: 0.24 }),
    Object.freeze({ id: 'navajo-03', file: '../audio/instruments/navajo-03.mp3', gain: 0.075, reverb: 0.24 }),
  ]),
  shared: Object.freeze([
    Object.freeze({ id: 'shared-sparkle', file: '../audio/instruments/shared/shared-sparkle.mp3', gain: 0.14, reverb: 0.22, duration: 0.57 }),
    Object.freeze({ id: 'shared-twinkle', file: '../audio/instruments/shared/shared-twinkle.mp3', gain: 0.10, reverb: 0.28, duration: 1.4 }),
    Object.freeze({ id: 'shared-shimmer', file: '../audio/instruments/shared/shared-shimmer.mp3', gain: 0.022, reverb: 0.25, duration: 1.65 }),
    Object.freeze({ id: 'shared-ambient-chime', file: '../audio/instruments/shared/shared-ambient-chime.mp3', gain: 0.038, reverb: 0.30, duration: 1.7 }),
    Object.freeze({ id: 'shared-synth-drone', file: '../audio/instruments/shared/shared-synth-drone.mp3', gain: 0.018, reverb: 0.24, duration: 1.1 }),
    Object.freeze({ id: 'shared-auen9', file: '../audio/instruments/shared/shared-auen9.mp3', gain: 0.07, reverb: 0.26, duration: 1.5 }),
  ]),
});

const CULTURE_INSTRUMENTS = Object.freeze({
  chinese: 'china',
  navajo: 'navajo',
});

// Stable 2–3 sample subsets for cultures that do not yet have a dedicated
// instrument recording set. These assignments intentionally avoid loading the
// entire pool for every culture, preserving a distinct sonic fingerprint.
const SHARED_CULTURE_SELECTION_IDS = Object.freeze({
  egyptian: Object.freeze(['shared-ambient-chime', 'shared-synth-drone', 'shared-shimmer']),
  hawaiian_starlines: Object.freeze(['shared-sparkle', 'shared-twinkle', 'shared-auen9']),
  indian: Object.freeze(['shared-ambient-chime', 'shared-shimmer']),
  maori: Object.freeze(['shared-auen9', 'shared-synth-drone', 'shared-sparkle']),
  northern_andes: Object.freeze(['shared-shimmer', 'shared-ambient-chime', 'shared-twinkle']),
  tongan: Object.freeze(['shared-twinkle', 'shared-sparkle']),
  boorong: Object.freeze(['shared-synth-drone', 'shared-auen9', 'shared-ambient-chime']),
  blackfoot: Object.freeze(['shared-sparkle', 'shared-auen9', 'shared-shimmer']),
  aztec: Object.freeze(['shared-twinkle', 'shared-synth-drone']),
  tupi: Object.freeze(['shared-auen9', 'shared-ambient-chime', 'shared-shimmer']),
});

const SHARED_BY_ID = new Map(INSTRUMENT_LIBRARY.shared.map((entry) => [entry.id, entry]));
const SHARED_CULTURE_INSTRUMENTS = Object.freeze(Object.fromEntries(
  Object.entries(SHARED_CULTURE_SELECTION_IDS).map(([cultureId, ids]) => [
    cultureId,
    Object.freeze(ids.map((id) => SHARED_BY_ID.get(id)).filter(Boolean)),
  ]),
));

export function instrumentSetForCulture(cultureId = '') {
  const id = String(cultureId || '');
  const setId = CULTURE_INSTRUMENTS[id];
  return setId ? INSTRUMENT_LIBRARY[setId] : SHARED_CULTURE_INSTRUMENTS[id] || null;
}

export function instrumentForStar(cultureId = '', starIndex = 0) {
  const set = instrumentSetForCulture(cultureId);
  if (!set?.length) return null;
  return set[Math.abs(Number(starIndex) || 0) % set.length];
}

export function listCivilizationSampleSets() {
  return Object.fromEntries(Object.entries(INSTRUMENT_LIBRARY).map(([id, entries]) => [id, entries.map((entry) => ({ ...entry }))]));
}

export { CULTURE_INSTRUMENTS, INSTRUMENT_LIBRARY, SHARED_CULTURE_INSTRUMENTS, SHARED_CULTURE_SELECTION_IDS };
