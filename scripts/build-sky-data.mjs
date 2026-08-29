import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { constellationChineseName } from './constellation-zh.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const culturesRoot = path.join(root, 'third_party/stellarium-skycultures');
const hygPath = process.env.HYG_CSV || path.join(root, 'third_party/hyg/hygdata_v41.csv');
const outputPath = path.join(root, 'public/data/sky-cultures.json');

if (!fs.existsSync(hygPath)) {
  if (fs.existsSync(outputPath)) {
    console.log(`HYG source catalog not present; preserving committed adapter output at ${outputPath}`);
    process.exit(0);
  }
  throw new Error('HYG source catalog is required when no generated sky-cultures.json exists. Set HYG_CSV to its path.');
}

const regionOrder = [
  'EAST ASIA', 'MEDITERRANEAN', 'MESOPOTAMIA', 'SOUTH ASIA',
  'ARABIAN WORLD', 'OCEANIA', 'AUSTRALIA', 'NORTH AMERICA',
  'SOUTH AMERICA', 'ARCTIC',
];

const regionLabels = {
  'EAST ASIA': '东亚 / EAST ASIA',
  MEDITERRANEAN: '地中海 / MEDITERRANEAN',
  MESOPOTAMIA: '美索不达米亚 / MESOPOTAMIA',
  'SOUTH ASIA': '南亚 / SOUTH ASIA',
  'ARABIAN WORLD': '阿拉伯世界 / ARABIAN WORLD',
  OCEANIA: '大洋洲 / OCEANIA',
  AUSTRALIA: '澳大利亚 / AUSTRALIA',
  'NORTH AMERICA': '北美洲 / NORTH AMERICA',
  'SOUTH AMERICA': '南美洲 / SOUTH AMERICA',
  ARCTIC: '北极地区 / ARCTIC',
};

const cultureConfig = {
  chinese: { regionGroup: 'EAST ASIA', zhName: '中国传统星空', introZh: '中国传统天文学以星官、三垣与二十八宿组织天空，并不等同于西方八十八星座。', features: ['enclosure', 'lunar-path', 'time-cycle'] },
  western: { regionGroup: 'MEDITERRANEAN', zhName: '西方古典星空', introZh: '以希腊—罗马传统和现代国际星座体系为主要来源的西方星空结构。', features: [] },
  arabic_lunar_stations: { regionGroup: 'ARABIAN WORLD', features: ['lunar-path'], blocked: 'CC BY-ND 4.0 does not permit the transformed data adapter output.' },
  egyptian: { regionGroup: 'MEDITERRANEAN', zhName: '古埃及星空', introZh: '古埃及天空传统与神祇、季节、时间和星钟体系相互关联。', features: ['time-cycle'] },
  hawaiian_starlines: { regionGroup: 'OCEANIA', zhName: '夏威夷星线', introZh: '夏威夷星线把星辰、航海方向、升落位置与跨洋路径联系起来。', features: ['horizon-gate'] },
  indian: { regionGroup: 'SOUTH ASIA', zhName: '印度吠陀星空', introZh: '印度天空传统以月亮运行路径上的宿位组织时间、方位与观察。', features: ['lunar-path'] },
  inuit: { regionGroup: 'ARCTIC', zhName: '因纽特星空', introZh: '因纽特星空知识来自北极环境中的季节、动物、方向与生活经验。', features: ['horizon-gate'] },
  kamilaroi: { regionGroup: 'AUSTRALIA', features: ['dark-region', 'landscape-correspondence'], blocked: 'CC BY-NC-ND 4.0 does not permit transformed release; upstream special permission is limited to Stellarium developers.' },
  maori: { regionGroup: 'OCEANIA', zhName: '毛利星空', introZh: '毛利天空传统连接航海、季节、祖先记忆与新年周期。', features: ['horizon-gate'] },
  navajo: { regionGroup: 'NORTH AMERICA', zhName: '纳瓦霍星空', introZh: '纳瓦霍星空把天体秩序、地景、仪式和生活中的平衡联系起来。', features: ['landscape-correspondence'] },
  northern_andes: { regionGroup: 'SOUTH AMERICA', zhName: '北安第斯星空', introZh: '北安第斯天空知识包含动物形象、银河暗区与地景之间的对应。', features: ['dark-region', 'landscape-correspondence'] },
  tongan: { regionGroup: 'OCEANIA', zhName: '汤加星空', introZh: '汤加天空传统将星辰名称、航海方位与海洋环境联系起来。', features: ['horizon-gate'] },
  boorong: { regionGroup: 'AUSTRALIA', zhName: '布隆星空', introZh: '布隆天空传统把星空、土地、季节与社会知识编织成共同的叙事。', features: ['landscape-correspondence'] },
  blackfoot: { regionGroup: 'NORTH AMERICA', zhName: '黑脚族星空', introZh: '黑脚族星空结构保留了天空形象与文化叙事之间的关系。', features: ['landscape-correspondence'] },
  aztec: { regionGroup: 'NORTH AMERICA', zhName: '阿兹特克星空', introZh: '阿兹特克天空传统与历法、仪式、方向和宇宙周期密切相关。', features: ['time-cycle'] },
  tupi: { regionGroup: 'SOUTH AMERICA', zhName: '图皮—瓜拉尼星空', introZh: '图皮—瓜拉尼天空知识包含季节线索、动物形象与银河暗区结构。', features: ['dark-region'] },
  tukano: { regionGroup: 'SOUTH AMERICA', zhName: '图卡诺星空', introZh: '图卡诺星空把星群、生态变化、仪式周期与自然现象联系起来。', features: ['time-cycle', 'landscape-correspondence'] },
};

function csvRow(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(value); value = '';
    } else value += char;
  }
  values.push(value);
  return values;
}

function loadStars() {
  const lines = fs.readFileSync(hygPath, 'utf8').trim().split(/\r?\n/);
  const headers = csvRow(lines.shift());
  const index = Object.fromEntries(headers.map((key, i) => [key, i]));
  const stars = new Map();
  for (const line of lines) {
    const row = csvRow(line);
    const hip = Number(row[index.hip]);
    if (!hip) continue;
    const ra = Number(row[index.ra]);
    const dec = Number(row[index.dec]);
    const mag = Number(row[index.mag]);
    if (!Number.isFinite(ra) || !Number.isFinite(dec)) continue;
    stars.set(hip, {
      id: hip,
      ra: Number(ra.toFixed(6)),
      dec: Number(dec.toFixed(6)),
      mag: Number.isFinite(mag) ? Number(mag.toFixed(2)) : 6,
      name: row[index.proper] || '',
    });
  }
  return stars;
}

function section(markdown, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const heading = new RegExp(`^##\\s+${escaped}\\s*$`, 'im');
  const match = heading.exec(markdown);
  if (!match) return '';
  const remainder = markdown.slice(match.index + match[0].length);
  const next = remainder.search(/^##\s+/m);
  return (next >= 0 ? remainder.slice(0, next) : remainder).trim();
}

function plain(markdown, max = 900) {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\{:[^}]+\}\s*$/gm, '')
    .replace(/[|*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function titleOf(markdown, fallback) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback;
}

function lineIds(constellation) {
  return (constellation.lines || [])
    .map((line) => line.filter((value) => Number.isInteger(value)))
    .filter((line) => line.length > 0);
}

function coordinateRegions(constellation) {
  return (constellation.lines || [])
    .filter((line) => line.some(Array.isArray))
    .map((line) => line.filter(Array.isArray).map(([ra, dec]) => ({ ra, dec })));
}

const starCatalog = loadStars();
const usedStars = new Set();
const cultures = [];
const unavailable = [
  { id: 'babylonian', reason: 'Not present in the selected upstream stellarium-skycultures repository snapshot.' },
];

for (const [id, config] of Object.entries(cultureConfig)) {
  const dir = path.join(culturesRoot, id);
  const source = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  const description = fs.readFileSync(path.join(dir, 'description.md'), 'utf8');
  if (config.blocked) {
    unavailable.push({
      id,
      reason: config.blocked,
      authors: plain(section(description, 'Authors'), 1600),
      license: plain(section(description, 'License'), 900),
    });
    continue;
  }
  const introduction = plain(section(description, 'Introduction'), 1200);
  const overview = plain(section(description, 'Description'), 1600) || introduction;
  const authors = plain(section(description, 'Authors'), 1600);
  const license = plain(section(description, 'License'), 900);
  const references = plain(section(description, 'References'), 4000);
  const constellations = source.constellations.map((item) => {
    const lines = lineIds(item);
    const starIds = [...new Set(lines.flat())].filter((hip) => starCatalog.has(hip));
    starIds.forEach((hip) => usedStars.add(hip));
    const coordinateLines = coordinateRegions(item);
    return {
      id: item.id,
      nativeName: item.common_name?.native || item.common_name?.pronounce || item.common_name?.english || item.id,
      translatedName: item.common_name?.english || item.common_name?.native || item.id,
      localizedName: {
        zh: id === 'chinese'
          ? (item.common_name?.native || item.common_name?.english || item.id)
          : constellationChineseName(id, item.id, `中文名：${item.common_name?.english || item.common_name?.native || item.id}`),
      },
      pronunciation: item.common_name?.pronounce || '',
      lines: lines.map((line) => line.filter((hip) => starCatalog.has(hip))).filter((line) => line.length > 0),
      stars: starIds,
      starCount: starIds.length,
      story: plain(item.description || item.descritpion || '', 700),
      coordinateLines,
      kind: coordinateLines.length ? 'dark-region' : 'line',
    };
  });
  cultures.push({
    id,
    region: source.region || '',
    regionGroup: config.regionGroup,
    regionLabel: regionLabels[config.regionGroup] || config.regionGroup,
    nativeName: titleOf(description, id),
    translatedName: titleOf(description, id),
    localizedName: { zh: config.zhName || titleOf(description, id), en: titleOf(description, id) },
    introductionZh: config.introZh || '',
    introduction,
    overview,
    constellations,
    stars: [...new Set(constellations.flatMap((item) => item.stars))],
    lines: constellations.flatMap((item) => item.lines),
    specialRegions: config.features.map((type) => ({ type, status: 'model-ready' })),
    stories: overview ? [overview] : [],
    references,
    authors,
    license,
    classification: source.classification || [],
    sourceFiles: [`${id}/index.json`, `${id}/description.md`],
    illustrationPolicy: 'not-bundled',
  });
}

for (const star of starCatalog.values()) {
  if (star.mag <= 5.65) usedStars.add(star.id);
}

const stars = [...usedStars]
  .map((id) => starCatalog.get(id))
  .filter(Boolean)
  .sort((a, b) => a.id - b.id);

const payload = {
  schemaVersion: 1,
  generatedFrom: {
    skyCultures: 'Stellarium/stellarium-skycultures',
    stars: 'Astronexus HYG Database v4.1',
    illustrations: 'excluded',
  },
  regionOrder,
  regionLabels,
  stars,
  cultures,
  unavailable,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload)}\n`);
console.log(`Wrote ${cultures.length} cultures and ${stars.length} stars to ${outputPath}`);
