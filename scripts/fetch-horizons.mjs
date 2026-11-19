// Einmalig ausführen: node scripts/fetch-horizons.mjs
// (hinter einem HTTP-Proxy: NODE_USE_ENV_PROXY=1 voranstellen)
// Holt heliozentrische Positionsvektoren (ekliptikal J2000, AU, TDB) aus JPL Horizons
// als Referenz für src/sim/kepler.test.ts. Die CI nutzt nur die committete Fixture.
import { writeFileSync } from 'node:fs';

// Horizons-IDs: Merkur/Venus = Planet, Erde = Erde-Mond-Baryzentrum, Mars–Neptun = Systembaryzentrum
// (passend zu den Elementen aus JPL "Approximate Positions of the Planets", Tabelle 1)
const BODIES = { mercury: '199', venus: '299', earth: '3', mars: '4', jupiter: '5', saturn: '6', uranus: '7', neptune: '8' };
// 1850-01-01, 1950-01-01, J2000.0, 2025-01-01, 2050-01-01 (JD TDB)
const JDS = [2396758.5, 2433282.5, 2451545.0, 2460676.5, 2469807.5];

const params = (command) =>
  new URLSearchParams({
    format: 'json',
    COMMAND: `'${command}'`,
    EPHEM_TYPE: 'VECTORS',
    CENTER: "'500@10'",
    REF_PLANE: 'ECLIPTIC',
    REF_SYSTEM: 'ICRF',
    OUT_UNITS: 'AU-D',
    VEC_TABLE: '1',
    CSV_FORMAT: 'YES',
    TLIST_TYPE: 'JD',
    TLIST: JDS.map((jd) => `'${jd}'`).join(' '),
  });

const out = { source: 'JPL Horizons, heliocentric ecliptic J2000, AU, TDB', samples: [] };
for (const [id, command] of Object.entries(BODIES)) {
  const res = await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${params(command)}`);
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
  const { result } = await res.json();
  const block = result.split('$$SOE')[1]?.split('$$EOE')[0];
  if (!block) throw new Error(`${id}: keine Daten\n${result}`);
  for (const line of block.trim().split('\n')) {
    const [jd, , x, y, z] = line.split(',').map((s) => s.trim());
    out.samples.push({ id, jd: Number(jd), x: Number(x), y: Number(y), z: Number(z) });
  }
}
if (out.samples.length !== Object.keys(BODIES).length * JDS.length) throw new Error('Unvollständige Daten');
writeFileSync(new URL('../src/sim/__fixtures__/horizons.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(`OK: ${out.samples.length} Samples`);
