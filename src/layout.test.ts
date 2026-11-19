import { describe, expect, it } from 'vitest';
import { placeholderPosition } from './layout';

describe('placeholderPosition', () => {
  it('liegt auf dem Kreis mit dem gegebenen Abstand', () => {
    for (let i = 0; i < 9; i++) {
      const { x, z } = placeholderPosition(i, 10);
      expect(Math.hypot(x, z)).toBeCloseTo(10);
    }
  });
});
