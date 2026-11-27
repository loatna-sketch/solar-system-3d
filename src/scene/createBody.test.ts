import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { bodies } from '../data/bodies';
import { COMPRESSED, REAL, sceneExtent, sceneRadius, sceneRingRadius } from '../scale';
import { focusDistance, minZoomDistance } from './cameraMath';
import { createOrbitLine, createRings, updateOrbitLine } from './createBody';
import type { TextureSource } from './textures';

/** Textur lädt nie – Geometrie ist unabhängig davon */
const noTextures: TextureSource = () => new Promise<THREE.Texture>(() => {});

/** Kleinster und größter Abstand der Ring-Vertices vom Körpermittelpunkt (Ringe liegen in der lokalen XZ-Ebene) */
function ringRadii(mesh: THREE.Mesh): [number, number] {
  const pos = mesh.geometry.attributes.position;
  const r = Array.from({ length: pos.count }, (_, i) => Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)));
  return [Math.min(...r), Math.max(...r)];
}

const ringed = bodies.filter((b) => b.rings);
const scales = [
  ['komprimiert', COMPRESSED],
  ['real', REAL],
] as const;

describe('createRings', () => {
  it('es gibt mindestens einen Körper mit Ringen', () => {
    expect(ringed.length).toBeGreaterThan(0);
  });

  it.each(scales)('Geometrie × root.scale stimmt mit sceneRingRadius/sceneExtent überein (%s)', (_, cfg) => {
    for (const body of ringed) {
      const rings = body.rings!;
      const [inner, outer] = ringRadii(createRings(rings, body.radiusKm, noTextures));
      const scale = sceneRadius(body.radiusKm, cfg); // root.scale in main.ts
      // Vertex-Attribute sind float32 → relative Toleranz
      expect(inner * scale / sceneRingRadius(rings.innerKm, body.radiusKm, cfg), body.id).toBeCloseTo(1, 6);
      expect(outer * scale / sceneExtent(body, cfg), body.id).toBeCloseTo(1, 6);
    }
  });

  it('liegt in der Äquatorebene der Kugel (lokal y = 0)', () => {
    const pos = createRings(ringed[0].rings!, ringed[0].radiusKm, noTextures).geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) expect(Math.abs(pos.getY(i))).toBeLessThan(1e-12);
  });
});

describe('Fokus vs. Zoomgrenze', () => {
  it.each(scales)('Fokusabstand liegt für jeden Körper über der Zoomgrenze (%s)', (_, cfg) => {
    for (const body of bodies) {
      expect(focusDistance(sceneRadius(body.radiusKm, cfg)), body.id).toBeGreaterThan(minZoomDistance(sceneExtent(body, cfg)));
    }
  });
});

describe('updateOrbitLine', () => {
  const square = (r: number): [number, number, number][] => [
    [r, 0, 0],
    [0, 0, r],
    [-r, 0, 0],
    [0, 0, -r],
  ];

  it('legt beim ersten Aufbau (0 → N Punkte) eine neue Geometrie an', () => {
    const line = createOrbitLine([]);
    const empty = line.geometry;
    updateOrbitLine(line, square(1));
    expect(line.geometry).not.toBe(empty);
    expect(line.geometry.getAttribute('position').count).toBe(4);
  });

  it('aktualisiert bei gleicher Punktzahl den Puffer in-place inkl. Bounding Sphere', () => {
    const line = createOrbitLine(square(1));
    const geometry = line.geometry;
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    const version = position.version;
    updateOrbitLine(line, square(5));
    expect(line.geometry).toBe(geometry);
    expect(position.getX(0)).toBe(5);
    expect(position.version).toBeGreaterThan(version);
    expect(geometry.boundingSphere!.radius).toBeCloseTo(5);
  });

  it('legt bei anderer Punktzahl eine neue Geometrie an', () => {
    const line = createOrbitLine(square(1));
    const geometry = line.geometry;
    updateOrbitLine(line, [...square(1), [1, 1, 1]]);
    expect(line.geometry).not.toBe(geometry);
    expect(line.geometry.getAttribute('position').count).toBe(5);
  });
});
