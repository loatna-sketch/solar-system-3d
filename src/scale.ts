import type { Vec3 } from './sim/kepler';

/**
 * Abbildung physikalischer Größen (km, AU) auf Szenen-Einheiten.
 * Die Simulation rechnet immer physikalisch; nur dieses Modul kennt den Darstellungsmaßstab.
 * Komprimiert: Potenzgesetz staucht die Dynamik (Sonne/Merkur ≈ 285:1 → ≈ 10:1, Neptun/Merkur-Abstand ≈ 78:1 → ≈ 9:1).
 */
export interface ScaleConfig {
  radiusFactor: number;
  radiusExponent: number;
  distanceFactor: number;
  distanceExponent: number;
}

export const COMPRESSED: ScaleConfig = {
  radiusFactor: 0.01,
  radiusExponent: 0.4,
  distanceFactor: 8,
  distanceExponent: 0.5,
};

export function sceneRadius(radiusKm: number, cfg: ScaleConfig = COMPRESSED): number {
  return cfg.radiusFactor * Math.pow(radiusKm, cfg.radiusExponent);
}

export function sceneDistance(distanceAu: number, cfg: ScaleConfig = COMPRESSED): number {
  return cfg.distanceFactor * Math.pow(distanceAu, cfg.distanceExponent);
}

/**
 * Heliozentrisch-ekliptikale Position (AU, z = Nord) → Szenenkoordinaten (Three.js, y = oben).
 * Achsen: (x, y, z)_ekl → (x, z, −y)_Szene (echte Drehung, keine Spiegelung).
 * Nur der Abstand zur Sonne wird komprimiert, die Richtung bleibt exakt.
 */
export function toScene([x, y, z]: Vec3, cfg: ScaleConfig = COMPRESSED): Vec3 {
  const r = Math.hypot(x, y, z);
  if (r === 0) return [0, 0, 0];
  const k = sceneDistance(r, cfg) / r;
  return [x * k, z * k, -y * k];
}

/** Richtungsvektor ekliptikal → Szene: nur der Achsentausch (x, y, z) → (x, z, −y), keine Kompression */
export function toSceneDirection([x, y, z]: Vec3): Vec3 {
  return [x, z, -y];
}

/** Ringradius in Szenen-Einheiten: skaliert im selben Verhältnis wie der Körperradius */
export function sceneRingRadius(ringKm: number, bodyRadiusKm: number, cfg: ScaleConfig = COMPRESSED): number {
  return sceneRadius(bodyRadiusKm, cfg) * (ringKm / bodyRadiusKm);
}
