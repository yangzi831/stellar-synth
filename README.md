# Stellar Synth / 星宿频率

**Play the Stars Across Cultures / 演奏不同文明眼中的星空**

An independent, local-first web instrument built from **D5 v13 — Sequencer Map** by Ewan Qian / 钱誉文. The original D5 canvas and Web Audio approach is preserved as a local reference build, then extended into an atlas for comparing sky-culture structures over fixed stellar positions.

## 在线试玩 / Live demo

**[打开 Stellar Synth / 星宿频率](https://yangzi831.github.io/stellar-synth/)**

GitHub Pages is the primary public demo and is suitable for ordinary mobile and WeChat access. The previous [one-sky-many-worlds GitHub Pages URL](https://yangzi831.github.io/one-sky-many-worlds/) is retained as a compatibility redirect. The alternate Sites deployment remains available at [one-sky-many-worlds.yzi763343.chatgpt.site](https://one-sky-many-worlds.yzi763343.chatgpt.site).

建议使用桌面浏览器与耳机。首次播放需要点击 `PLAY` 解锁浏览器音频；`PANIC` 可立即停止全部声音。

Desktop browser and headphones are recommended. Click `PLAY` once to unlock browser audio; `PANIC` immediately stops all active voices.

## What is included

- A local copy of the D5 v13 baseline, including the v12 runtime and v13 map patch.
- ATLAS, PLAY and COMPARE modes.
- Chinese/English interface labels, bilingual culture introductions and local Chinese display names for all 572 loaded constellations/asterisms.
- One-click culture entry from the launch screen.
- Direct constellation focus, persistent zoom controls, all-sky reset, previous/next navigation and an overview locator.
- Brighter culture-specific star points rendered above constellation lines.
- Computer-keyboard performance for up to 72 landmark stars: `1–0`, `Q–P`, `A–L`, `Z–M`, with `Shift` opening the second key bank.
- A shared audio/visual gesture state: press creates a filtered pluck and liquid ripple, hold adds beat-synchronous pulse and bounded granular texture, and release leaves a 2.8-second filter/reverb and topology tail.
- 150 BPM synthesis-only Web Audio engine derived from D5; no samples or recordings.
- True stellar positions and apparent magnitudes for 3,719 HIP stars.
- A build-time adapter for Stellarium `index.json` and `description.md` data.
- Dynamic culture menus grouped by region.
- Pan, wheel/pinch-style zoom, constellation selection, local landmark views, micro sequencers, route playback, fullscreen, STOP and PANIC.
- Runtime ABOUT and CREDITS / SOURCES pages.
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

- Culture-specific renderers for Chinese enclosure hierarchy, lunar rings, horizon gates, dark Milky Way regions, Egyptian decan clocks and landscape correspondences are represented in the data model but are not yet specialized visual renderers.
- Chinese data retains individual Xingguan geometry and names. A full scholarly navigation layer for 三垣 → 四象 → 二十八宿 → 星官 → 恒星 needs an additional curated hierarchy dataset; it is not inferred from Western constellations.
- Constellation stories are shown when the source attaches one; otherwise the culture introduction is used.
- No upstream illustration is bundled. Illustration-specific licensing would need a separate review before inclusion.

## Credits and licenses

Based on D5 v13 — Sequencer Map by Ewan Qian / 钱誉文.  
Original code used and modified under the MIT License.

See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) and [DATA_SOURCES_AND_LICENSES.md](./DATA_SOURCES_AND_LICENSES.md) for source-level details.
