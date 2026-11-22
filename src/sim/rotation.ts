import type { PoleOrientation, RotationModel } from '../data/bodies';
import type { Vec3 } from './kepler';
import { JD_J2000 } from './time';

const DEG = Math.PI / 180;
/** Schiefe der Ekliptik zur Epoche J2000 (IAU 2006) */
export const OBLIQUITY_J2000_DEG = 23.4392911;

const cross = ([ax, ay, az]: Vec3, [bx, by, bz]: Vec3): Vec3 => [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];

/** Äquatorial (ICRF) → ekliptikal J2000: Drehung um die x-Achse (Frühlingspunkt) um −ε */
export function equatorialToEcliptic([x, y, z]: Vec3): Vec3 {
  const c = Math.cos(OBLIQUITY_J2000_DEG * DEG);
  const s = Math.sin(OBLIQUITY_J2000_DEG * DEG);
  return [x, c * y + s * z, -s * y + c * z];
}

/** Einheitsvektor zum IAU-Nordpol, ekliptikal J2000 */
export function poleEcliptic(pole: PoleOrientation): Vec3 {
  const a = pole.ra * DEG;
  const d = pole.dec * DEG;
  return equatorialToEcliptic([Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]);
}

/** Körperfeste Achsen, ekliptikal J2000 (orthonormal, rechtshändig: east = pole × meridian) */
export interface Orientation {
  /** Richtung Länge 0° am Äquator */
  meridian: Vec3;
  /** IAU-Nordpol */
  pole: Vec3;
  /** Richtung Länge 90° Ost am Äquator */
  east: Vec3;
}

/**
 * Orientierung nach IAU: Der Nullmeridian liegt um W östlich des aufsteigenden Knotens
 * des Körperäquators auf dem ICRF-Äquator (Knoten bei RA = α0 + 90°).
 * Vereinfachung: Pol fest (keine Präzession, keine Nutationsterme).
 */
export function orientationEcliptic(pole: PoleOrientation, rotation: RotationModel, jd: number): Orientation {
  return orientationAtMeridian(pole, primeMeridianDeg(rotation, jd));
}

/** Nullmeridian-Winkel W in Grad (unbeschränkt, nicht normiert) */
export function primeMeridianDeg(rotation: RotationModel, jd: number): number {
  return rotation.w0 + rotation.rate * (jd - JD_J2000);
}

/** Orientierung für einen vorgegebenen Nullmeridian-Winkel W (Grad) */
export function orientationAtMeridian(pole: PoleOrientation, wDeg: number): Orientation {
  const a = pole.ra * DEG;
  const d = pole.dec * DEG;
  const p: Vec3 = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
  const node: Vec3 = [-Math.sin(a), Math.cos(a), 0];
  const nodeEast = cross(p, node);
  const w = wDeg * DEG;
  const meridian: Vec3 = [0, 1, 2].map((i) => Math.cos(w) * node[i] + Math.sin(w) * nodeEast[i]) as Vec3;
  return {
    meridian: equatorialToEcliptic(meridian),
    pole: equatorialToEcliptic(p),
    east: equatorialToEcliptic(cross(p, meridian)),
  };
}

/** Siderische Rotationsperiode in Stunden (negativ = rückläufig) */
export function rotationPeriodHours(rotation: RotationModel): number {
  return (360 / rotation.rate) * 24;
}

/**
 * Sichtbare Eigenrotation begrenzen: Bei hoher Zeitraffung dreht sich z. B. die Erde mehrmals pro Frame
 * (Stroboskop-Effekt: scheinbar Stillstand oder Rückwärtsdrehung). Oberhalb der Grenze dreht der Körper
 * mit gedeckelter Geschwindigkeit in der richtigen Richtung; darunter gilt der exakte Winkel.
 */
export const MAX_VISIBLE_TURNS_PER_SECOND = 0.5;

/** Umdrehungen pro Echtzeit-Sekunde bei gegebener Simulationsrate (Tage/s, mit Vorzeichen) */
export function spinTurnsPerSecond(rotation: RotationModel, simDaysPerSecond: number): number {
  return (rotation.rate / 360) * simDaysPerSecond;
}

/** Nächster angezeigter W-Winkel: exakt, wenn langsam genug, sonst mit gedeckelter Drehgeschwindigkeit */
export function displayedMeridianDeg(
  rotation: RotationModel,
  jd: number,
  simDaysPerSecond: number,
  previousDeg: number,
  dtSeconds: number,
): number {
  const turns = spinTurnsPerSecond(rotation, simDaysPerSecond);
  if (Math.abs(turns) <= MAX_VISIBLE_TURNS_PER_SECOND) return primeMeridianDeg(rotation, jd);
  return previousDeg + Math.sign(turns) * MAX_VISIBLE_TURNS_PER_SECOND * 360 * dtSeconds;
}
