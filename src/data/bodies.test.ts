import { describe, expect, it } from 'vitest';
import { bodies } from './bodies';

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
