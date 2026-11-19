/**
 * Abbildung physikalischer Größen (km, AU) auf Szenen-Einheiten.
 * Die Simulation rechnet immer physikalisch; nur diese Funktionen kennen den Darstellungsmaßstab.
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
