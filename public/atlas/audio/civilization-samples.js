/*
 * User-provided MP3 instrument catalogue.
 *
 * The catalogue owns only mapping and gain policy. SamplePlayer owns Web Audio
 * loading/routing, so adding another culture never touches star components or
 * the sequencer's musical grammar.
 */
const INSTRUMENT_LIBRARY = Object.freeze({
  china: Object.freeze([
    Object.freeze({ id: 'china-01', file: '/audio/instruments/china-01.mp3', gain: 0.048, reverb: 0.2 }),
    Object.freeze({ id: 'china-02', file: '/audio/instruments/china-02.mp3', gain: 0.048, reverb: 0.2 }),
    Object.freeze({ id: 'china-03', file: '/audio/instruments/china-03.mp3', gain: 0.048, reverb: 0.2 }),
    Object.freeze({ id: 'china-04', file: '/audio/instruments/china-04.mp3', gain: 0.048, reverb: 0.2 }),
  ]),
  navajo: Object.freeze([
    Object.freeze({ id: 'navajo-01', file: '/audio/instruments/navajo-01.mp3', gain: 0.07, reverb: 0.24 }),
    Object.freeze({ id: 'navajo-02', file: '/audio/instruments/navajo-02.mp3', gain: 0.075, reverb: 0.24 }),
    Object.freeze({ id: 'navajo-03', file: '/audio/instruments/navajo-03.mp3', gain: 0.075, reverb: 0.24 }),
  ]),
});

const CULTURE_INSTRUMENTS = Object.freeze({
  chinese: 'china',
  navajo: 'navajo',
});

export function instrumentSetForCulture(cultureId = '') {
  const setId = CULTURE_INSTRUMENTS[String(cultureId || '')];
  return setId ? INSTRUMENT_LIBRARY[setId] : null;
}

export function instrumentForStar(cultureId = '', starIndex = 0) {
  const set = instrumentSetForCulture(cultureId);
  if (!set?.length) return null;
  return set[Math.abs(Number(starIndex) || 0) % set.length];
}

export function listCivilizationSampleSets() {
  return Object.fromEntries(Object.entries(INSTRUMENT_LIBRARY).map(([id, entries]) => [id, entries.map((entry) => ({ ...entry }))]));
}

export { CULTURE_INSTRUMENTS, INSTRUMENT_LIBRARY };
