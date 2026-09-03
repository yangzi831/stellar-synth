# Stellar Synth / 星宿频率

**Play the Stars Across Cultures / 演奏不同文明眼中的星空**

An independently developed, local-first audiovisual instrument that turns cross-cultural star-map structures into playable and generative electronic music.

## 在线试玩 / Live demo

**[打开 Stellar Synth / 星宿频率（Netlify）](https://stellar-synth-atlas.netlify.app/atlas/)**

The existing [GitHub Pages deployment](https://yangzi831.github.io/stellar-synth/) remains public and suitable for ordinary mobile and WeChat access. The previous [one-sky-many-worlds GitHub Pages URL](https://yangzi831.github.io/one-sky-many-worlds/) is retained as a compatibility redirect. The alternate Sites deployment remains available at [one-sky-many-worlds.yzi763343.chatgpt.site](https://one-sky-many-worlds.yzi763343.chatgpt.site).

建议使用桌面浏览器与耳机。首次播放需要点击 `PLAY` 解锁浏览器音频；`PANIC` 可立即停止全部声音。

Desktop browser and headphones are recommended. Click `PLAY` once to unlock browser audio; `PANIC` immediately stops all active voices.

## What is included

- A preserved third-party reference baseline for license compliance and regression comparison.
- ATLAS, PLAY and COMPARE modes.
- COMPARE continuously alternates between the two selected cultures: each side completes a readable musical segment before fixed stars retain their positions, old relations dissolve, and the other culture's matched landmark, lines, labels and sound path take over.
- Chinese/English interface labels, bilingual culture introductions and local Chinese display names for all 572 loaded constellations/asterisms.
- One-click culture entry from the launch screen.
- Direct constellation focus, persistent zoom controls, all-sky reset, previous/next navigation and an overview locator. On phones, PLAY opens with the landmark story collapsed into a translucent name card; one-finger taps perform stars and a two-finger pinch pans/zooms the fixed sky map. Desktop keeps the full story panel expanded.
- Brighter culture-specific star points rendered above constellation lines.
- Computer-keyboard performance for up to 52 landmark stars: `Q–P`, `A–L`, `Z–M`, with `Shift` opening the second letter-key bank. Number keys never trigger stars.
- A shared audio/visual gesture state: press plays a star-specific tuned bell, soft keys, filtered synth, electronic bass or procedural resonant mallet while creating a liquid ripple; hold adds beat-synchronous pulse and bounded granular texture; release leaves a 2.8-second filter/reverb and topology tail.
- Three automatic event arrangements share one `StarEvent` clock: **PATH** preserves distance-shaped melodic travel, **GROUP** turns branch points, line segments and bright-star neighbourhoods into controlled simultaneous events, and **FRAGMENT** produces deterministic 2–4 hit pointillistic bursts with bounded rests and afterglow. Visual groups may contain more stars than the 3–5 representative audio voices, keeping dense maps clean.
- A shared four-bar `GrooveTemplate` at 123 BPM is selected deterministically for each constellation. Kick, bass, hats, motif slots and constellation events all read the same pocket; eight curated templates allow bounded omissions and accents without creating competing clocks. Motif is the main melodic voice, while synth and harmony are sparse responses rather than continuously stacked leads.
- Number keys launch the same nine quantized Scenes used by the automatic director: `1 INTRO`, `2 GROOVE A`, `3 GROOVE B`, `4 BASS DRIVE`, `5 SYNTH BUILD`, `6 MELODIC OPEN`, `7 BREAK`, `8 PEAK / RETURN`, `9 OUTRO / EXPERIMENT`; `0` returns control to AUTO. Scene changes apply on the next bar.
- PLAY now has two clear participation depths. **STAR** preserves direct Press/Hold/Release performance. **LOOP** is a guided looper with an 8-beat count-in, then records six aligned 16-beat layers: DRUM, BASS, ARP, HARMONY, MELODY and TEXTURE. Every letter key or touched star adopts the current layer's instrument; completed layers immediately repeat beneath the next recording, untouched stages become intentional REST layers, and one layer can be re-recorded without stopping the others.
- Bass and synth use deterministic two-bar patterns; lead uses a four-bar phrase; pad/atmosphere evolves over eight bars. Musical mutation is limited to 8-bar omission, cutoff, octave and final-note changes. Glitch is restricted to 8-bar transitions and selected Scene endings.
- Manual star performance has its own foreground bus, approximately 5.5 dB above the arrangement bus. A star press briefly ducks the automatic background by roughly 3.7 dB with a short recovery, keeping the performed note obvious without stopping the track.
- The master chain uses a globally raised input stage (a second 50% increase over the previous mix), gentle compression, makeup gain and a final limiter set near -1 dBFS. This preserves the drum/music/bed balance while making both automatic playback and manual performance more present. A lightweight analyser exposes test-only running RMS and peak diagnostics without driving musical or visual behaviour.
- A bounded Canvas 2D `ParticleField` reads the same `VisualMusicState` as the audio engine. Every four-on-the-floor kick produces a restrained radial impulse; closed hats create tight flicker, open hats create outward sparkles, bass drives field breathing, stable synth gates create directional trails, lead phrases trace their source stars, and pads extend field lifetime. Manual star bursts are larger and longer than automatic events. Chinese, Western and Indian profiles use radial, linear and orbital motion respectively without changing colour.
- A `CultureMusicProfile` layer now sits above landmark and star identity. Chinese uses open pentatonic spacing and sparse metallic gestures; Western favours modal vertical voicing; Indian Vedic uses a stable tonic/fifth drone and cyclic melodic orbit; Northern Andes uses airy, pulse-oriented pentatonic ostinati and call/response grouping. These four profiles are culture-inspired electronic prototypes, not claims of ethnomusicological reconstruction or ethnic-instrument emulation. The other 11 cultures retain the prior deterministic stellar-modal fallback.
- 123 BPM Web Audio engine derived from D5, combining a stable techno pulse with constellation-specific bass pockets, memorable motifs, restrained counter gestures and an air-led cosmic bed. The spatial path uses a 58 ms pre-delay plus high-passed, damped convolution so dry attacks remain clear while the tail opens behind them. Six synth recipes—analog pluck, saw sequence, acid-like resonant sequence, soft poly, dark pulse and FM/metallic—remain synthesis-only; no external sample pack or recording is bundled.
- `public/audio/culture-samples.json` reserves optional licensed sample slots for future Chinese, Western and Indian recordings. All slots currently resolve to synthesis fallbacks and `bundledRecordings` remains false. A recording may only be published after its provenance and license are added to the third-party notices.
- True stellar positions and apparent magnitudes for 3,719 HIP stars.
- A build-time adapter for Stellarium `index.json` and `description.md` data.
- Dynamic culture menus grouped by region.
- Pan, wheel/pinch-style zoom, constellation selection, local landmark views, micro sequencers, route playback, fullscreen, STOP and PANIC.
- Runtime ABOUT and PROJECT / SOURCES pages.
- Offline production assets; the demo does not request a remote API.

## Local preview

The development preview runs at:

`http://localhost:3000/`

The standalone atlas is served at:

`http://localhost:3000/atlas/index.html`

The unmodified-layout D5 v13 reference is available at:

`http://localhost:3000/reference/d5-v13/index.html`

The single reference-runtime change is a defensive clamp for a negative canvas arc radius that otherwise throws intermittently in the original DROP animation.

## Project commands

```bash
npm run dev
npm test
npm run build
```

`npm run build` regenerates the local sky-culture adapter output before creating the production build.
The repository includes the generated browser-ready JSON. The optional 32 MB HYG v4.1 CSV source catalog is not committed; set `HYG_CSV` to a local copy when you want to regenerate stellar positions from the raw catalog.

## Available cultures

- Chinese
- Western
- Egyptian
- Indian Vedic / Nakshatras
- Hawaiian Starlines
- Māori
- Tongan
- Boorong
- Inuit
- Navajo
- Blackfoot
- Northern Andes
- Aztec
- Tupi-Guarani
- Tukano

## Verified but not loaded

- **Babylonian** — not present in the selected upstream `stellarium-skycultures` snapshot.
- **Arabic Lunar Stations** — upstream data is CC BY-ND 4.0 with a separate permission limited to Stellarium Labs; transformed adapter output is therefore not shipped.
- **Kamilaroi/Euahlayi** — upstream data is CC BY-NC-ND 4.0 with a separate permission limited to Stellarium developers; transformed adapter output is therefore not shipped.

## Still incomplete

- The Chinese, Western, Indian Vedic and Northern Andes musical grammars are deliberately bounded prototypes. More culture profiles require source-led musical research rather than invented mappings.
- Chinese, Western and Indian now also define arrangement grammar—groove density, kick/bass behaviour, synth strategy, harmony evolution, texture and form—not only pitch/voicing. These remain culture-inspired abstract electronic prototypes, not reconstructions of historical performance practice.
- Guided LOOP is deliberately a performance looper rather than a DAW: it records quantized trigger choices, supports full restart, layer clearing and focused layer re-recording, but does not yet provide per-note editing, undo history, saving/export or MIDI clock.
- Manual keyboard, mouse and touch remain direct single-star instruments in STAR mode. Manual multi-star chords, Web MIDI, actual licensed sample recordings and COMPARE interweaving are deferred.
- Culture-specific renderers for Chinese enclosure hierarchy, lunar rings, horizon gates, dark Milky Way regions, Egyptian decan clocks and landscape correspondences are represented in the data model but are not yet specialized visual renderers.
- Chinese data retains individual Xingguan geometry and names. A full scholarly navigation layer for 三垣 → 四象 → 二十八宿 → 星官 → 恒星 needs an additional curated hierarchy dataset; it is not inferred from Western constellations.
- Constellation stories are shown when the source attaches one; otherwise the culture introduction is used.
- No upstream illustration is bundled. Illustration-specific licensing would need a separate review before inclusion.

## Sources and licenses

Required third-party code, data provenance and license records are preserved in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) and [DATA_SOURCES_AND_LICENSES.md](./DATA_SOURCES_AND_LICENSES.md).
