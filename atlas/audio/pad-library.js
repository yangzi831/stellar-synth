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
    file: '../audio/atmosphere/641814__logicmoon__c.mp3',
    // Linear gain, approximately -22 dB before the shared music bus.
    // User-requested second reduction: 50% of the previous calibrated level.
    gain: 0.026,
    pan: -0.08,
  }),
  Object.freeze({
    id: 'sergequadrad',
    file: '../audio/atmosphere/654519__sergequadrad.mp3',
    gain: 0.024375,
    pan: 0.07,
  }),
  Object.freeze({
    id: 'newlocknew',
    file: '../audio/atmosphere/725347__newlocknew__.mp3',
    // This source is quieter than the other two; give it a controlled 2x
    // source compensation while keeping the pad well below star voices.
    gain: 0.15,
    pan: 0,
  }),
  Object.freeze({
    id: 'fieldsofhope',
    file: '../audio/atmosphere/427454__eardeer__fieldsofhope.mp3',
    // This 77-second field pad measures close to the existing Serge bed;
    // keep the source gain matched so the five mapped cultures stay balanced.
    gain: 0.024,
    pan: -0.03,
  }),
]);

const EXPLICIT_CULTURE_PADS = Object.freeze({
  // The new fourth bed gives these cultures a shared, quieter atmospheric
  // identity without changing their instrument/sample mappings.
  chinese: 3,
  china: 3,
  boorong: 3,
  egyptian: 3,
  tongan: 3,
  tonga: 3,
  aztec: 3,
  indian: 1,
  western: 2,
});
// Keep the original three-pad hash space for every culture that is not
// explicitly assigned above. Adding the fourth pad must not reshuffle the
// existing atmosphere identities unexpectedly.
const LEGACY_PAD_COUNT = 3;

// Optional user-provided MP3 beds. These are a second, culture-specific
// atmosphere layer; the original mapped synth pads remain underneath them.
const CULTURE_ATMOSPHERE = Object.freeze({
  western: Object.freeze({
    id: 'western-classical-choirs',
    file: '../audio/atmosphere/culture/western-classical-choirs.mp3',
    gain: 0.026,
    pan: 0,
    reverb: 0.34,
  }),
  tukano: Object.freeze({
    id: 'tukano-natural',
    file: '../audio/atmosphere/culture/tukano-natural.mp3',
    gain: 0.021,
    pan: -0.05,
    reverb: 0.38,
  }),
  inuit: Object.freeze({
    id: 'inuit-breath-texture',
    file: '../audio/atmosphere/culture/inuit-breath-texture.mp3',
    gain: 0.022,
    pan: 0.06,
    reverb: 0.4,
  }),
});

// Tukano and Inuit have a distinct foreground atmosphere, so their original
// generic pad is tucked underneath it. Western keeps the previous pad level.
const GENERIC_PAD_GAIN_SCALES = Object.freeze({ tukano: 0.44, inuit: 0.44 });

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
  const index = EXPLICIT_CULTURE_PADS[id] ?? (hashText(id) % LEGACY_PAD_COUNT);
  const pad = PAD_LIBRARY[index];
  const gainScale = GENERIC_PAD_GAIN_SCALES[id] ?? 1;
  return gainScale === 1 ? pad : { ...pad, gain: pad.gain * gainScale };
}

export function atmosphereForCulture(cultureId = '') {
  return CULTURE_ATMOSPHERE[String(cultureId || '')] || null;
}

export function listPads() {
  return PAD_LIBRARY.map((pad) => ({ ...pad }));
}

export { PAD_LIBRARY, EXPLICIT_CULTURE_PADS, CULTURE_ATMOSPHERE, GENERIC_PAD_GAIN_SCALES };
