# Culture audio layers

This build includes user-provided MP3 assets for three atmosphere beds and two
instrument sample sets. MP3 is the only bundled recording format.

`public/atlas/audio/atmosphere-manager.js` owns looping, fades and atmosphere
routing. `public/atlas/audio/sample-player.js` owns one-shot instrument loading
and routing. Both modules retain the procedural Web Audio voices as an immediate
fallback while a sample is loading or unavailable.

The mapping and gain policy live in `public/atlas/audio/pad-library.js` and
`public/atlas/audio/civilization-samples.js`. Future recordings may be added
only after their source and publication permission have been documented in
`THIRD_PARTY_NOTICES.md`.
