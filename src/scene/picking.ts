import * as THREE from 'three';

/** Maximale Zeigerbewegung zwischen pointerdown und pointerup, die noch als Klick (nicht Drehen) gilt */
export const CLICK_TOLERANCE_PX = 5;

export function isClick(down: { x: number; y: number }, up: { x: number; y: number }): boolean {
  return Math.hypot(up.x - down.x, up.y - down.y) < CLICK_TOLERANCE_PX;
}

/** Klick auf ein Mesh → onPick(mesh.name). Drags (OrbitControls) werden ignoriert. */
export function attachPicking(
  dom: HTMLElement,
  camera: THREE.Camera,
  objects: THREE.Object3D[],
  onPick: (id: string) => void,
): void {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down: { x: number; y: number } | null = null;

  dom.addEventListener('pointerdown', (e) => {
    down = e.isPrimary ? { x: e.clientX, y: e.clientY } : null;
  });
  dom.addEventListener('pointerup', (e) => {
    if (!down || !e.isPrimary || !isClick(down, { x: e.clientX, y: e.clientY })) return;
    down = null;
    const rect = dom.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(objects, false)[0];
    if (hit) onPick(hit.object.name);
  });
}
