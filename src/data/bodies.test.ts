import { describe, expect, it } from 'vitest';
import { bodies } from './bodies';

// Vite listet die Dateien zur Build-/Testzeit (ohne sie zu laden)
const textureFiles = new Set(
  Object.keys(import.meta.glob('../../public/textures/*', { query: '?url' })).map((path) => path.split('/').pop()),
);
const textureExists = (file: string) => textureFiles.has(file);

const ELEMENT_KEYS = ['a', 'e', 'I', 'L', 'longPeri', 'longNode'] as const;

describe('bodies.json', () => {
  it('hat genau einen Stern und acht Planeten', () => {
    expect(bodies.filter((b) => b.type === 'star')).toHaveLength(1);
    expect(bodies.filter((b) => b.type === 'planet')).toHaveLength(8);
  });

  it('hat eindeutige IDs', () => {
    expect(new Set(bodies.map((b) => b.id)).size).toBe(bodies.length);
  });

  it.each(bodies)('$id hat plausible Werte', (b) => {
    expect(['star', 'planet']).toContain(b.type);
    expect(b.name.length).toBeGreaterThan(0);
    expect(b.radiusKm).toBeGreaterThan(0);
    expect(b.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(textureExists(b.texture), b.texture).toBe(true);
    expect(b.pole.ra).toBeGreaterThanOrEqual(0);
    expect(b.pole.ra).toBeLessThan(360);
    expect(Math.abs(b.pole.dec)).toBeLessThanOrEqual(90);
    expect(Number.isFinite(b.rotation.w0) && b.rotation.rate !== 0).toBe(true);
    if (b.rings) {
      expect(textureExists(b.rings.texture), b.rings.texture).toBe(true);
      expect(b.rings.innerKm).toBeGreaterThan(b.radiusKm);
      expect(b.rings.outerKm).toBeGreaterThan(b.rings.innerKm);
    }
    if (b.type === 'star') {
      expect(b.orbit).toBeUndefined();
      return;
    }
    expect(b.orbit).toBeDefined();
    for (const key of ELEMENT_KEYS) {
      const el = b.orbit![key];
      expect(el, key).toHaveLength(2);
      expect(el.every(Number.isFinite), key).toBe(true);
    }
    expect(b.orbit!.a[0]).toBeGreaterThan(0);
    expect(b.orbit!.e[0]).toBeGreaterThanOrEqual(0);
    expect(b.orbit!.e[0]).toBeLessThan(1);
  });
});
