import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { BodyData } from '../data/bodies';

export function createBodyMesh(body: BodyData, radius: number): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 64, 32);
  const material =
    body.type === 'star'
      ? new THREE.MeshBasicMaterial({ color: body.color })
      : new THREE.MeshStandardMaterial({ color: body.color, roughness: 0.9, metalness: 0 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = body.id;

  const div = document.createElement('div');
  div.className = 'label';
  div.textContent = body.name;
  const label = new CSS2DObject(div);
  label.position.set(0, radius, 0);
  mesh.add(label);

  return mesh;
}

export function createOrbitLine(distance: number, segments = 256): THREE.LineLoop {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(distance * Math.cos(a), 0, distance * Math.sin(a)));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0x5a6b8c, transparent: true, opacity: 0.45 });
  return new THREE.LineLoop(geometry, material);
}
