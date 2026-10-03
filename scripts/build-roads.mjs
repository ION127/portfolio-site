// 데모 도로망을 만든다: npm run roads (원본을 다시 받으려면 npm run roads -- --fetch)
// OpenStreetMap(Overpass API)에서 승차대 범위의 도로를 받아 src/data/seoul-roads.json으로 줄인다.
// 도로 데이터 © OpenStreetMap contributors, ODbL 1.0.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { buildRoadGraph } from '../src/lib/baro-sim/roadbuild.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// 승차대 254곳의 경계(37.453–37.671, 126.803–127.164)에 1km를 더한 범위
const BBOX = [37.444, 126.792, 37.68, 127.175];
const CACHE = resolve(root, 'node_modules/.cache/osm-seoul-roads.json');
const OUT = resolve(root, 'src/data/seoul-roads.json');
const QUERY =
  '[out:json][timeout:300];' +
  `way["highway"~"^(motorway|trunk|primary|secondary|tertiary)(_link)?$"](${BBOX.join(',')})->.w;` +
  '.w out body qt;node(w.w);out skel qt;';

if (!existsSync(CACHE) || process.argv.includes('--fetch')) {
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'jjcloud.dev portfolio road graph (https://jjcloud.dev)' },
    body: new URLSearchParams({ data: QUERY }),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  mkdirSync(dirname(CACHE), { recursive: true });
  writeFileSync(CACHE, await res.text());
}

const raw = JSON.parse(readFileSync(CACHE, 'utf8'));
const stamp = raw.osm3s?.timestamp_osm_base?.slice(0, 10) ?? 'unknown';
const { data, stats } = buildRoadGraph(raw.elements, { attribution: `© OpenStreetMap contributors, ODbL 1.0 (OSM ${stamp})` });
const json = JSON.stringify(data);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, json);
console.log({ ...stats, kb: Math.round(json.length / 1024), gzipKb: Math.round(gzipSync(json).length / 1024) });
