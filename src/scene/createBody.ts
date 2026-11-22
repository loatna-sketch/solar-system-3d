import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { BodyData, RingData } from '../data/bodies';
import { sceneRingRadius } from '../scale';
import type { Vec3 } from '../sim/kepler';
import type { TextureSource } from './textures';

/** HDR-Faktor der Sonne: hebt sie über die Bloom-Schwelle (1,0), Planeten bleiben darunter */
const SUN_HDR = 1.6;

export interface BodyObjects {
  /** Position + Label; dreht sich nicht (Label bleibt „oben“) */
  root: THREE.Group;
  /** Kugel mit Orientierung/Eigenrotation; Ringe hängen daran */
  sphere: THREE.Mesh;
}

function applyTexture(
  textures: TextureSource,
  file: string,
  material: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial,
  intensity = 1,
): void {
  textures(file)
    .then((texture) => {
      material.map = texture;
      material.color.setScalar(intensity);
      material.visible = true;
      material.needsUpdate = true;
    })
    // Fallback: Grundfarbe bleibt (bzw. Ring bleibt unsichtbar)
    .catch((err) => console.warn(`Textur ${file} nicht geladen`, err));
}

export function createBody(body: BodyData, radius: number, textures: TextureSource): BodyObjects {
  const root = new THREE.Group();
  root.name = body.id;

  const isStar = body.type === 'star';
  const material = isStar
    ? new THREE.MeshBasicMaterial({ color: new THREE.Color(body.color).multiplyScalar(SUN_HDR) })
    : new THREE.MeshStandardMaterial({ color: body.color, roughness: 0.95, metalness: 0 });
  applyTexture(textures, body.texture, material, isStar ? SUN_HDR : 1);

  const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), material);
  sphere.name = body.id; // Picking liefert die ID
  root.add(sphere);

  if (body.rings) sphere.add(createRings(body.rings, body.radiusKm, textures));

  const div = document.createElement('div');
  div.className = 'label';
  div.textContent = body.name;
  div.dataset.id = body.id; // klickbar → Fokus (siehe main.ts)
  const label = new CSS2DObject(div);
  label.position.set(0, radius, 0);
  root.add(label);

  return { root, sphere };
}

/**
 * Ringe in der Äquatorebene (lokale XZ-Ebene der Kugel).
 * Die Textur ist ein radialer Streifen → UV radial umrechnen: u = 0 innen, u = 1 außen.
 */
export function createRings(rings: RingData, bodyRadiusKm: number, textures: TextureSource): THREE.Mesh {
  const inner = sceneRingRadius(rings.innerKm, bodyRadiusKm);
  const outer = sceneRingRadius(rings.outerKm, bodyRadiusKm);
  const geometry = new THREE.RingGeometry(inner, outer, 128, 1);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    uv.setXY(i, (r - inner) / (outer - inner), 0.5);
  }
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    roughness: 1,
    metalness: 0,
    visible: false, // erst mit Textur sichtbar – ohne Alpha wäre es eine Scheibe
  });
  applyTexture(textures, rings.texture, material);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'rings';
  return mesh;
}

function orbitGeometry(points: Vec3[]): THREE.BufferGeometry {
  return new THREE.BufferGeometry().setFromPoints(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
}

/** Geschlossene Bahnlinie aus Szenen-Punkten */
export function createOrbitLine(points: Vec3[]): THREE.LineLoop {
  const material = new THREE.LineBasicMaterial({ color: 0x5a6b8c, transparent: true, opacity: 0.45 });
  return new THREE.LineLoop(orbitGeometry(points), material);
}

export function updateOrbitLine(line: THREE.LineLoop, points: Vec3[]): void {
  line.geometry.dispose();
  line.geometry = orbitGeometry(points);
}
