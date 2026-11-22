// Einmalig ausführen: node scripts/fetch-textures.mjs
// (hinter einem HTTP-Proxy: NODE_USE_ENV_PROXY=1 voranstellen)
// Lädt die 2k-Texturen von Solar System Scope (CC BY 4.0, https://www.solarsystemscope.com/textures/)
// nach public/textures/. Die Dateien werden committet; CI und Build brauchen kein Netz.
import { mkdirSync, writeFileSync } from 'node:fs';

const FILES = [
  '2k_sun.jpg',
  '2k_mercury.jpg',
  '2k_venus_atmosphere.jpg',
  '2k_earth_daymap.jpg',
  '2k_mars.jpg',
  '2k_jupiter.jpg',
  '2k_saturn.jpg',
  '2k_saturn_ring_alpha.png',
  '2k_uranus.jpg',
  '2k_neptune.jpg',
  '2k_stars_milky_way.jpg',
];

const MAGIC = { jpg: [0xff, 0xd8, 0xff], png: [0x89, 0x50, 0x4e, 0x47] };
const outDir = new URL('../public/textures/', import.meta.url);
mkdirSync(outDir, { recursive: true });

for (const file of FILES) {
  const res = await fetch(`https://www.solarsystemscope.com/textures/download/${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const magic = MAGIC[file.split('.').pop()];
  if (!magic.every((b, i) => bytes[i] === b)) throw new Error(`${file}: kein gültiges Bild (${res.headers.get('content-type')})`);
  writeFileSync(new URL(file, outDir), bytes);
  console.log(`${file}: ${(bytes.length / 1024).toFixed(0)} KB`);
}
