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

/** Astronomische Einheit in km (IAU 2012) */
export const AU_KM = 149_597_870.7;

/**
 * Realer Maßstab: linear, Radien und Abstände in derselben Einheit.
 * 1 AU bleibt wie im komprimierten Maßstab bei distanceFactor → Übersicht ändert sich nur moderat.
 */
export const REAL: ScaleConfig = {
  radiusFactor: COMPRESSED.distanceFactor / AU_KM,
  radiusExponent: 1,
  distanceFactor: COMPRESSED.distanceFactor,
  distanceExponent: 1,
};

/**
 * Überblendung zweier Maßstäbe im Log-Raum: Faktor geometrisch, Exponent linear.
 * Ergebnis ist wieder ein Potenzgesetz; t = 0 → a, t = 1 → b (exakt).
 * Ein Übergang wirkt so über mehrere Größenordnungen gleichmäßig.
 */
export function blendScale(a: ScaleConfig, b: ScaleConfig, t: number): ScaleConfig {
  const geo = (x: number, y: number) => x ** (1 - t) * y ** t;
  const lin = (x: number, y: number) => x + (y - x) * t;
  return {
    radiusFactor: geo(a.radiusFactor, b.radiusFactor),
    radiusExponent: lin(a.radiusExponent, b.radiusExponent),
    distanceFactor: geo(a.distanceFactor, b.distanceFactor),
    distanceExponent: lin(a.distanceExponent, b.distanceExponent),
  };
}

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
