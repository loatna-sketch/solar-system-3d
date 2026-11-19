import * as THREE from 'three';

export interface Sphere {
  center: THREE.Vector3;
  radius: number;
}

const toPoint = new THREE.Vector3();
const toCenter = new THREE.Vector3();

/**
 * Liegt eine der Kugeln zwischen Auge und Punkt? (Strahl-Kugel-Schnitt auf der Strecke Auge→Punkt)
 * Nötig, weil CSS2D-Labels nicht vom Tiefenpuffer verdeckt werden.
 */
export function isOccluded(eye: THREE.Vector3, point: THREE.Vector3, spheres: Iterable<Sphere>): boolean {
  toPoint.subVectors(point, eye);
  const length = toPoint.length();
  if (length === 0) return false;
  toPoint.divideScalar(length);

  for (const { center, radius } of spheres) {
    toCenter.subVectors(center, eye);
    const tClosest = toCenter.dot(toPoint);
    if (tClosest < 0) continue; // Kugel hinter dem Auge
    const d2 = toCenter.lengthSq() - tClosest * tClosest;
    if (d2 > radius * radius) continue; // Strahl verfehlt die Kugel
    const tEnter = tClosest - Math.sqrt(radius * radius - d2);
    if (tEnter > 0 && tEnter < length) return true;
  }
  return false;
}
