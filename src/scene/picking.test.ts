import { describe, expect, it } from 'vitest';
import { CLICK_TOLERANCE_PX, isClick, onPointerClick } from './picking';

describe('isClick', () => {
  it('wertet kleine Bewegungen als Klick, Drags nicht', () => {
    expect(isClick({ x: 100, y: 100 }, { x: 102, y: 101 })).toBe(true);
    expect(isClick({ x: 100, y: 100 }, { x: 100 + CLICK_TOLERANCE_PX, y: 100 })).toBe(false);
    expect(isClick({ x: 100, y: 100 }, { x: 160, y: 140 })).toBe(false);
  });
});

/** Minimaler EventTarget-Ersatz (Vitest läuft ohne DOM) */
function fakeElement() {
  const target = new EventTarget();
  const fire = (type: string, pointerId: number, isPrimary: boolean, x = 100, y = 100) =>
    target.dispatchEvent(Object.assign(new Event(type), { pointerId, isPrimary, clientX: x, clientY: y }));
  return { el: target as unknown as HTMLElement, fire };
}

describe('onPointerClick', () => {
  it('meldet einen einfachen Klick', () => {
    const { el, fire } = fakeElement();
    let clicks = 0;
    onPointerClick(el, () => clicks++);
    fire('pointerdown', 1, true);
    fire('pointerup', 1, true, 101, 100);
    expect(clicks).toBe(1);
  });

  it('ignoriert Drags, Pinch mit zweitem Finger und abgebrochene Gesten', () => {
    const { el, fire } = fakeElement();
    let clicks = 0;
    onPointerClick(el, () => clicks++);
    fire('pointerdown', 1, true);
    fire('pointerup', 1, true, 150, 100); // Drag
    fire('pointerdown', 1, true);
    fire('pointerdown', 2, false); // zweiter Finger → Pinch
    fire('pointerup', 2, false, 180, 100);
    fire('pointerup', 1, true); // erster Finger blieb still
    fire('pointerdown', 1, true);
    fire('pointercancel', 1, true);
    expect(clicks).toBe(0);
  });

  it('meldet nach einer Pinch-Geste wieder normale Klicks', () => {
    const { el, fire } = fakeElement();
    let clicks = 0;
    onPointerClick(el, () => clicks++);
    fire('pointerdown', 1, true);
    fire('pointerdown', 2, false);
    fire('pointerup', 2, false);
    fire('pointerup', 1, true);
    fire('pointerdown', 3, true);
    fire('pointerup', 3, true);
    expect(clicks).toBe(1);
  });
});
