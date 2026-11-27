import { describe, expect, it } from 'vitest';
import { createScaleTransition, stepTransition, toggleTarget, transitionValue } from './scaleTransition';

function run(s: ReturnType<typeof createScaleTransition>, frames: number, dt: number): number[] {
  const values: number[] = [];
  for (let i = 0; i < frames; i++) {
    stepTransition(s, dt);
    values.push(transitionValue(s));
  }
  return values;
}

describe('ScaleTransition', () => {
  it('ruht ohne Umschalten', () => {
    const s = createScaleTransition(2);
    expect(stepTransition(s, 0.016)).toBe(false);
    expect(transitionValue(s)).toBe(0);
  });

  it('erreicht das Ziel nach der Dauer exakt und monoton', () => {
    const s = createScaleTransition(2);
    toggleTarget(s);
    const values = run(s, 125, 0.016); // 2 s
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    expect(values[60]).toBeGreaterThan(0);
    expect(values[60]).toBeLessThan(1);
    expect(values.at(-1)).toBe(1);
    expect(stepTransition(s, 0.016)).toBe(false);
  });

  it('kehrt mitten im Übergang ohne Sprung um und landet wieder bei 0', () => {
    const s = createScaleTransition(2);
    toggleTarget(s);
    run(s, 50, 0.016);
    const before = transitionValue(s);
    toggleTarget(s);
    stepTransition(s, 0.016);
    const after = transitionValue(s);
    expect(after).toBeLessThan(before);
    expect(before - after).toBeLessThan(0.05);
    run(s, 200, 0.016);
    expect(transitionValue(s)).toBe(0);
  });

  it('springt bei Dauer 0 sofort (reduzierte Bewegung)', () => {
    const s = createScaleTransition(0);
    toggleTarget(s);
    expect(stepTransition(s, 0)).toBe(true);
    expect(transitionValue(s)).toBe(1);
  });

  it('ignoriert negative Zeitschritte und klemmt große', () => {
    const s = createScaleTransition(2);
    toggleTarget(s);
    expect(stepTransition(s, -1)).toBe(false);
    expect(s.progress).toBe(0);
    stepTransition(s, 100);
    expect(s.progress).toBe(1);
  });
});
