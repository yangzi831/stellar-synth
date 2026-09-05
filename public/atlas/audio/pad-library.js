/*
 * Atmosphere pad catalogue.
 *
 * The catalogue deliberately contains no playback code. Keeping the mapping
 * separate means future culture beds can be added without touching the
 * sequencer or star-trigger voices.
 */

const PAD_LIBRARY = Object.freeze([
  Object.freeze({
    id: 'logicmoon-c',
    file: '/audio/atmosphere/641814__logicmoon__c.mp3',
    // Linear gain, approximately -22 dB before the shared music bus.
    gain: 0.08,
    pan: -0.08,
  }),
  Object.freeze({
    id: 'sergequadrad',
    file: '/audio/atmosphere/654519__sergequadrad.mp3',
    gain: 0.075,
    pan: 0.07,
  }),
  Object.freeze({
    id: 'newlocknew',
    file: '/audio/atmosphere/725347__newlocknew__.mp3',
    // This source is quieter than the other two; give it a controlled 2x
    // source compensation while keeping the pad well below star voices.
    gain: 0.15,
    pan: 0,
  }),
]);

const EXPLICIT_CULTURE_PADS = Object.freeze({
  chinese: 0,
  indian: 1,
  western: 2,
});

function hashText(value = '') {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function padForCulture(cultureId = '') {
  const id = String(cultureId || 'fallback');
  const index = EXPLICIT_CULTURE_PADS[id] ?? (hashText(id) % PAD_LIBRARY.length);
  return PAD_LIBRARY[index];
}

export function listPads() {
  return PAD_LIBRARY.map((pad) => ({ ...pad }));
}

export { PAD_LIBRARY, EXPLICIT_CULTURE_PADS };
