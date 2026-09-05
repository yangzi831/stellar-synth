# Third-Party Notices

This project contains or adapts third-party code and data. The notices below do not replace the full license texts or source-specific attribution requirements.

## D5 v13 — Sequencer Map

**Author:** Ewan Qian / 钱誉文  
**Source:** <https://github.com/ewanqian/portfolio>  
**Public demo:** <https://ewanqian.site/lab/personal-av-instrument/topological-playground/>  
**Pinned v12 runtime source:** commit `4678d766ab36418f262dba612968eeeb9a614c08`  
**License:** MIT License

Based on D5 v13 — Sequencer Map by Ewan Qian / 钱誉文.  
Original code used and modified under the MIT License.

The original repository MIT text and copyright notice are preserved in [LICENSE](./LICENSE) and [third_party/ewan-qian/LICENSE](./third_party/ewan-qian/LICENSE).

The following local files contain the reference implementation or derived audio logic:

- `public/reference/d5-v13/d5-v12-topological-playground.js`
- `public/reference/d5-v13/v13-map-patch.js`
- `public/atlas/audio-engine.js`

The reference runtime has one defensive canvas-radius clamp to prevent an intermittent `IndexSizeError`; the audio signal graph is otherwise kept as the baseline for the new engine.

### Audio materials

The D5 runtime and the core engine generate sound in JavaScript through the Web Audio API. The signal path uses oscillators, procedurally generated and reused percussion/glitch sample buffers, filtered noise, arpeggios, pads, electronic bass, stereo panning, delay, reverb, gain envelopes and dynamics compression. The current build additionally includes user-provided MP3 files in `public/audio/atmosphere/culture/` and `public/audio/instruments/`; they are routed only by the dedicated audio layer modules and are not presented as upstream or third-party sample-pack content.

The MP3 filenames and civilization assignments were supplied locally by the project owner. Their external source/licensing metadata was not provided in this workspace; the files should be replaced or separately cleared before any distribution that requires third-party provenance. The procedural synthesis fallback remains available for every missing or unavailable sample.

## Stellarium Sky Cultures

**Project:** Stellarium/stellarium-skycultures  
**Source:** <https://github.com/Stellarium/stellarium-skycultures>  
**Snapshot used:** `014fbb5e59233d133c22f9811af96b67d05a95c9`

Each sky culture has its own authors and license recorded in its `description.md`. The project retains the audited `index.json` and `description.md` files under `third_party/stellarium-skycultures/`. No illustration is copied into the public demo or production build.

The repository-level AGPL text is retained at `third_party/stellarium-skycultures/LICENSE-AGPL-3.0.txt`. The runtime uses generated JSON data rather than upstream code.

See [DATA_SOURCES_AND_LICENSES.md](./DATA_SOURCES_AND_LICENSES.md) for culture-by-culture notices.

## Astronexus HYG Database v4.1

**Author/project:** David Nash / Astronexus  
**Source:** <https://github.com/astronexus/HYG-Database>  
**Snapshot used:** `c7f7f883fe678cc7680169a50ccd7dcc49b060ce`  
**File:** `hyg/CURRENT/hygdata_v41.csv`  
**License:** Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)

The HYG database supplies right ascension, declination and apparent magnitude for the Hipparcos identifiers referenced by the sky-culture line data. Its license notice is retained at `third_party/hyg/LICENSE`.

## Framework and package notices

JavaScript package license metadata remains available in `package-lock.json` and the installed package manifests. No package-provided imagery, audio or editorial content is redistributed by the atlas.
