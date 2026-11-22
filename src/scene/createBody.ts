import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { BodyData } from '../data/bodies';
import type { Vec3 } from '../sim/kepler';

/** Einheitskugel; der Radius in Szenen-Einheiten kommt über mesh.scale (ändert sich mit dem Maßstab) */
export function createBodyMesh(body: BodyData): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(1, 64, 32);
  const material =
    body.type === 'star'
      ? new THREE.MeshBasicMaterial({ color: body.color })
      : new THREE.MeshStandardMaterial({ color: body.color, roughness: 0.9, metalness: 0 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = body.id;

  const div = document.createElement('div');
  div.className = 'label';
  div.textContent = body.name;
  div.dataset.id = body.id; // klickbar → Fokus (siehe main.ts)
  const label = new CSS2DObject(div);
  label.position.set(0, 1, 0); // Nordpol; skaliert mit dem Mesh
  mesh.add(label);

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
