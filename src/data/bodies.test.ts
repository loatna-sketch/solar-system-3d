import { describe, expect, it } from 'vitest';
import { bodies } from './bodies';

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
    if (b.type === 'planet') expect(b.semiMajorAxisAu).toBeGreaterThan(0);
    else expect(b.semiMajorAxisAu).toBe(0);
  });
});
