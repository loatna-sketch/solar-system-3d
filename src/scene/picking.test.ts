import { describe, expect, it } from 'vitest';
import { CLICK_TOLERANCE_PX, isClick } from './picking';

describe('isClick', () => {
  it('wertet kleine Bewegungen als Klick, Drags nicht', () => {
    expect(isClick({ x: 100, y: 100 }, { x: 102, y: 101 })).toBe(true);
    expect(isClick({ x: 100, y: 100 }, { x: 100 + CLICK_TOLERANCE_PX, y: 100 })).toBe(false);
    expect(isClick({ x: 100, y: 100 }, { x: 160, y: 140 })).toBe(false);
  });
});
