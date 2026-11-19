import { describe, expect, it } from 'vitest';
import { createClock, MAX_DT_SECONDS, tick } from './clock';

describe('Clock', () => {
  it('läuft mit rate · dt vorwärts', () => {
    const c = createClock(100, 2);
    tick(c, 0.05);
    expect(c.jd).toBeCloseTo(100.1);
  });

  it('läuft rückwärts', () => {
    const c = createClock(100, 2);
    c.direction = -1;
    tick(c, 0.05);
    expect(c.jd).toBeCloseTo(99.9);
  });

  it('steht bei Pause', () => {
    const c = createClock(100, 2);
    c.paused = true;
    tick(c, 0.05);
    expect(c.jd).toBe(100);
  });

  it('begrenzt große und negative Zeitschritte', () => {
    const c = createClock(100, 1);
    tick(c, 30);
    expect(c.jd).toBeCloseTo(100 + MAX_DT_SECONDS);
    tick(c, -5);
    expect(c.jd).toBeCloseTo(100 + MAX_DT_SECONDS);
  });
});
