# Data Sources and Licenses

The build-time adapter reads each retained `index.json` and `description.md`, then emits a unified local `SkyCulture` object with the fields `id`, `region`, `nativeName`, `translatedName`, `introduction`, `constellations`, `stars`, `lines`, `specialRegions`, `stories`, `references`, `authors` and `license`.

Illustration files are not copied into `public/` and are not referenced by the runtime.

| Culture | Runtime status | Upstream authors (summary) | Upstream license |
| --- | --- | --- | --- |
| Chinese | Loaded | Karrie Berglund; Sun Shuwei; Stellarium team | Text and lines: CC BY-SA; listed historical map images: Public Domain |
| Western | Loaded | Stellarium team; illustrations by Johan Meuris | Text/data: CC BY-SA; illustrations: Free Art License (not bundled) |
| Egyptian | Loaded | Karrie Berglund; misibacsi; Susanne M. Hoffmann | GNU GPL v2.0 |
| Indian Vedic | Loaded | Tanmoy Saha; Vishvas Vasuki; Sanskrit Coders contributors; Susanne M. Hoffmann | CC BY-SA |
| Hawaiian Starlines | Loaded | Kamehameha Schools Kapalama contributors; Kealoha Kaneakua; Susanne M. Hoffmann | CC BY-SA |
| Māori | Loaded | Dan Smale | Text and lines: CC BY-SA |
| Tongan | Loaded | Dan Smale; Susanne M. Hoffmann | CC BY-SA |
| Boorong | Loaded | John Morieson; Alex Cherney; Susanne M. Hoffmann | Data and illustrations: CC BY-SA; illustrations not bundled |
| Inuit | Loaded | Karrie Berglund; Johan Meuris; Susanne M. Hoffmann; Stellarium team | Text/data: GNU GPL v2.0; illustrations: Free Art License (not bundled) |
| Navajo | Loaded | Karrie Berglund | GNU GPL v2.0 |
| Blackfoot | Loaded | Doina Bucur | CC BY-SA |
| Northern Andes | Loaded | Andres Ayala Quinatoa; Susanne M. Hoffmann | GNU GPL v2.0 |
| Aztec | Loaded | Enrique Gómez Candelario; Rafael Rojas Segoviano; Stellarium team and named contributors | GNU GPL v2.0 |
| Tupi-Guarani | Loaded | Paulo Marcelo Pontes | GNU GPL v2.0 |
| Tukano | Loaded | Walmir Thomazi Cardoso; Antonio Gumercindo Taques dos Santos; Youssif Ganthous Filho; Stellarium team | Text, lines and illustrations: CC BY-SA; illustrations not bundled |
| Arabic Lunar Stations | Not loaded | Khalid al-Ajaji | CC BY-ND 4.0; separate inclusion permission limited to Stellarium Labs |
| Kamilaroi/Euahlayi | Not loaded | Robert S. Fuller; Ghillar Michael Anderson; Susanne M. Hoffmann | CC BY-NC-ND 4.0; separate inclusion permission limited to Stellarium developers |
| Babylonian | Not available | — | Not present in the selected upstream repository snapshot |

## License decisions requiring human review

1. Confirm the desired publication model for GPL v2.0 sky-culture data before any public deployment beyond this local deliverable.
2. Obtain separate permission before transforming or publishing Arabic Lunar Stations or Kamilaroi/Euahlayi data through this adapter.
3. Review every illustration file separately before adding it; culture-level text/data permission does not automatically cover artwork.
4. Confirm whether a later Chinese hierarchy dataset may be combined with the present CC BY-SA line data and under which version of CC BY-SA.

## Source integrity

- Sky-culture menus are generated from the adapter output; culture names are not hard-coded in the interface.
- HIP identifiers remain attached to constellation records.
- J2000-style RA/Dec coordinates and magnitudes are retained from HYG v4.1.
- Fixed global star coordinates are shared by ATLAS, PLAY and COMPARE.
- The adapter records authors, license, source files and illustration policy on every available culture object.
