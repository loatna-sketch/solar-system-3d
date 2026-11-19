import * as THREE from 'three';

/** Maximale Zeigerbewegung zwischen pointerdown und pointerup, die noch als Klick (nicht Drehen) gilt */
export const CLICK_TOLERANCE_PX = 5;

export function isClick(down: { x: number; y: number }, up: { x: number; y: number }): boolean {
  return Math.hypot(up.x - down.x, up.y - down.y) < CLICK_TOLERANCE_PX;
}

/**
 * Erkennt Klicks auf `dom`: wenig Bewegung zwischen pointerdown und pointerup, nur ein Zeiger beteiligt
 * (Pinch-Zoom mit zwei Fingern ist kein Klick). Drags (OrbitControls) werden ignoriert.
 */
export function onPointerClick(dom: HTMLElement, handler: (e: PointerEvent) => void): void {
  const active = new Set<number>();
  let down: { x: number; y: number } | null = null;
  let multiTouch = false;

  dom.addEventListener('pointerdown', (e) => {
    active.add(e.pointerId);
    if (active.size > 1) multiTouch = true;
    if (e.isPrimary) {
      down = { x: e.clientX, y: e.clientY };
      multiTouch = active.size > 1;
    }
  });
  const release = (e: PointerEvent) => {
    active.delete(e.pointerId);
    const start = down;
    if (e.isPrimary) down = null;
    if (e.type !== 'pointerup' || !e.isPrimary || !start || multiTouch) return;
    if (isClick(start, { x: e.clientX, y: e.clientY })) handler(e);
  };
  dom.addEventListener('pointerup', release);
  dom.addEventListener('pointercancel', release);
}

/** Klick auf ein Mesh → onPick(mesh.name) */
export function attachPicking(
  dom: HTMLElement,
  camera: THREE.Camera,
  objects: THREE.Object3D[],
  onPick: (id: string) => void,
): void {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  onPointerClick(dom, (e) => {
    const rect = dom.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(objects, false)[0];
    if (hit) onPick(hit.object.name);
  });
}
