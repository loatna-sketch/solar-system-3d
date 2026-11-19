import type { OrbitalElements } from '../data/bodies';
import { centuriesSinceJ2000 } from './time';

/** Heliozentrische Position, ekliptikal J2000, in AU (z = ekliptisch Nord) */
export type Vec3 = [number, number, number];

export interface ElementsAtEpoch {
  a: number;
  e: number;
  /** Alle Winkel in Radiant */
  I: number;
  /** Argument des Perihels ω = ϖ − Ω */
  argPeri: number;
  longNode: number;
  /** Mittlere Anomalie, normiert auf [−π, π) */
  M: number;
}

const DEG = Math.PI / 180;

function normalizeAngle(rad: number): number {
  const twoPi = 2 * Math.PI;
  return rad - twoPi * Math.floor((rad + Math.PI) / twoPi);
}

export function elementsAt(orbit: OrbitalElements, jd: number): ElementsAtEpoch {
  const T = centuriesSinceJ2000(jd);
  const at = ([v, rate]: [number, number]) => v + rate * T;
  const longPeri = at(orbit.longPeri) * DEG;
  const longNode = at(orbit.longNode) * DEG;
  return {
    a: at(orbit.a),
    e: at(orbit.e),
    I: at(orbit.I) * DEG,
    argPeri: longPeri - longNode,
    longNode,
    M: normalizeAngle(at(orbit.L) * DEG - longPeri),
  };
}

/** Löst die Kepler-Gleichung E − e·sin E = M per Newton-Verfahren (M, E in Radiant, 0 ≤ e < 1). */
export function solveKepler(M: number, e: number, tolerance = 1e-6 * DEG): number {
  let E = e < 0.8 ? M : Math.PI * Math.sign(M || 1);
  for (let i = 0; i < 50; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < tolerance) break;
  }
  return E;
}

/** Position aus Elementen bei gegebener exzentrischer Anomalie E */
function positionFromE(el: ElementsAtEpoch, E: number): Vec3 {
  // Koordinaten in der Bahnebene, x' zeigt zum Perihel
  const xp = el.a * (Math.cos(E) - el.e);
  const yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);

  const cw = Math.cos(el.argPeri), sw = Math.sin(el.argPeri);
  const cO = Math.cos(el.longNode), sO = Math.sin(el.longNode);
  const cI = Math.cos(el.I), sI = Math.sin(el.I);

  return [
    (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    sw * sI * xp + cw * sI * yp,
  ];
}

export function heliocentricPosition(orbit: OrbitalElements, jd: number): Vec3 {
  const el = elementsAt(orbit, jd);
  return positionFromE(el, solveKepler(el.M, el.e));
}

/** Stützpunkte der vollständigen Bahnellipse zum Zeitpunkt jd (gleichmäßig in E verteilt) */
export function orbitPoints(orbit: OrbitalElements, jd: number, segments = 256): Vec3[] {
  const el = elementsAt(orbit, jd);
  return Array.from({ length: segments }, (_, i) => positionFromE(el, (i / segments) * 2 * Math.PI));
}
