# Culture audio layers

This build includes user-provided MP3 assets for three atmosphere beds, two
dedicated instrument sets and one shared six-sample instrument pool. MP3 is the
only bundled recording format.

`public/atlas/audio/atmosphere-manager.js` owns looping, fades and atmosphere
routing. `public/atlas/audio/sample-player.js` owns one-shot instrument loading
and routing. Both modules retain the procedural Web Audio voices as an immediate
fallback while a sample is loading or unavailable.

The mapping and gain policy live in `public/atlas/audio/pad-library.js` and
`public/atlas/audio/civilization-samples.js`. Future recordings may be added
only after their source and publication permission have been documented in
`THIRD_PARTY_NOTICES.md`.

Chinese and Navajo use their dedicated sets. Egyptian, Hawaiian Starlines,
Indian, Maori, Northern Andes, Tongan, Boorong, Blackfoot, Aztec and Tupi each
use a stable subset of two or three files from `instruments/shared/`. Western,
Tukano and Inuit retain their culture-specific atmosphere recordings without a
shared instrument overlay.
