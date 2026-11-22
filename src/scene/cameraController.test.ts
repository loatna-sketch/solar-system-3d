import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CameraController, type FocusTarget } from './cameraController';
import { fitDistance, focusDistance } from './cameraMath';

const OVERVIEW_RADIUS = 45;
const FLIGHT = 1.2;

function setup() {
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.01, 10_000);
  const target = new THREE.Vector3();
  const controller = new CameraController(camera, target, OVERVIEW_RADIUS, FLIGHT);
  controller.snapToOverview();
  const planet = new THREE.Object3D();
  planet.position.set(10, 0, -5);
  const focus: FocusTarget = { id: 'earth', object: planet, radius: 0.5 };
  return { camera, target, controller, planet, focus };
}

/** Simuliert n Frames mit dt; optional bewegt sich der Planet pro Frame */
function run(controller: CameraController, frames: number, dt: number, move?: () => void) {
  for (let i = 0; i < frames; i++) {
    move?.();
    controller.update(dt);
  }
}

describe('CameraController', () => {
  it('startet in der Übersicht mit passendem Abstand', () => {
    const { camera, target, controller } = setup();
    expect(controller.mode).toBe('overview');
    expect(target.length()).toBe(0);
    expect(camera.position.length()).toBeCloseTo(fitDistance(OVERVIEW_RADIUS, 50, 16 / 9));
  });

  it('fliegt zum Körper und folgt ihm danach', () => {
    const { camera, target, controller, planet, focus } = setup();
    controller.focus(focus);
    expect(controller.mode).toBe('flying');
    run(controller, 10, 0.06);
    expect(controller.mode).toBe('flying'); // nach 0,6 s noch unterwegs
    run(controller, 20, 0.06);
    expect(controller.mode).toBe('following');
    expect(target.distanceTo(planet.position)).toBeCloseTo(0);
    expect(camera.position.distanceTo(planet.position)).toBeCloseTo(focusDistance(focus.radius));
  });

  it('landet exakt auf dem Körper, auch wenn er sich während des Flugs bewegt', () => {
    const { target, controller, planet, focus } = setup();
    controller.focus(focus);
    run(controller, 40, 0.05, () => planet.position.x += 0.3);
    expect(controller.mode).toBe('following');
    expect(target.distanceTo(planet.position)).toBeCloseTo(0);
  });

  it('führt im Follow Kamera und Target mit, Abstand und Blickwinkel bleiben', () => {
    const { camera, target, controller, planet, focus } = setup();
    controller.focus(focus);
    run(controller, 30, 0.05);
    const offsetBefore = camera.position.clone().sub(target);
    run(controller, 50, 0.016, () => planet.position.add(new THREE.Vector3(0.2, 0.01, -0.1)));
    expect(target.distanceTo(planet.position)).toBeCloseTo(0);
    const offsetAfter = camera.position.clone().sub(target);
    expect(offsetAfter.distanceTo(offsetBefore)).toBeCloseTo(0);
  });

  it('fliegt mit overview() zurück zum Ursprung', () => {
    const { camera, target, controller, focus } = setup();
    controller.focus(focus);
    run(controller, 30, 0.05);
    controller.overview();
    expect(controller.focused).toBeNull();
    run(controller, 30, 0.05);
    expect(controller.mode).toBe('overview');
    expect(target.length()).toBeCloseTo(0);
    expect(camera.position.length()).toBeCloseTo(fitDistance(OVERVIEW_RADIUS, 50, 16 / 9));
  });

  it('fliegt nie durch das eigene Target, auch bei entgegengesetzten Offsets', () => {
    const { camera, target, controller, planet, focus } = setup();
    // Kamera steht zwischen altem Ziel (Ursprung) und neuem Ziel → Start- und End-Offset zeigen entgegengesetzt
    planet.position.set(20, 0, 0);
    target.set(0, 0, 0);
    camera.position.set(2, 0, 0);
    controller.focus(focus);
    let minDistance = Infinity;
    for (let i = 0; i < 40; i++) {
      controller.update(0.05);
      minDistance = Math.min(minDistance, camera.position.distanceTo(target));
    }
    expect(controller.mode).toBe('following');
    expect(minDistance).toBeGreaterThanOrEqual(Math.min(2, focusDistance(focus.radius)) * 0.99);
  });

  it('passt die Übersicht nach Größenänderung an und behält die Blickrichtung', () => {
    const { camera, target, controller } = setup();
    camera.position.set(0, 10, 0); // Nutzer hat gedreht und gezoomt
    camera.aspect = 0.5;
    controller.refitOverview();
    expect(target.length()).toBe(0);
    expect(camera.position.clone().normalize().y).toBeCloseTo(1);
    expect(camera.position.length()).toBeCloseTo(fitDistance(OVERVIEW_RADIUS, 50, 0.5));
  });

  it('refitOverview ändert nichts, solange ein Körper fokussiert ist', () => {
    const { camera, controller, focus } = setup();
    controller.focus(focus);
    run(controller, 30, 0.05);
    const before = camera.position.clone();
    controller.refitOverview();
    expect(camera.position.equals(before)).toBe(true);
  });

  it('rescale im Follow skaliert den Abstand mit dem Radius und behält die Blickrichtung', () => {
    const { camera, target, controller, planet, focus } = setup();
    controller.focus(focus);
    run(controller, 30, 0.05);
    const direction = camera.position.clone().sub(target).normalize();
    const ratio = 1e-3;
    focus.radius *= ratio;
    controller.rescale(OVERVIEW_RADIUS * 5, ratio);
    planet.position.multiplyScalar(5); // Maßstab verschiebt auch die Position
    controller.update(0.016);
    expect(target.distanceTo(planet.position)).toBeCloseTo(0);
    const offset = camera.position.clone().sub(target);
    expect(offset.length()).toBeCloseTo(focusDistance(focus.radius), 8);
    expect(offset.normalize().dot(direction)).toBeCloseTo(1);
  });

  it('rescale in der Übersicht skaliert den Abstand mit dem Übersichtsradius (Nutzer-Zoom bleibt relativ)', () => {
    const { camera, controller } = setup();
    camera.position.multiplyScalar(0.5); // Nutzer hat hineingezoomt
    const before = camera.position.clone();
    controller.rescale(OVERVIEW_RADIUS * 4, 123);
    expect(camera.position.distanceTo(before.multiplyScalar(4))).toBeCloseTo(0);
  });

  it('landet bei focusDistance des neuen Radius, wenn der Maßstab mitten im Flug wechselt', () => {
    const { camera, controller, planet, focus } = setup();
    controller.focus(focus);
    run(controller, 10, 0.05);
    focus.radius = 1e-4;
    controller.rescale(OVERVIEW_RADIUS * 5, 1e-4 / 0.5);
    run(controller, 30, 0.05);
    expect(controller.mode).toBe('following');
    expect(camera.position.distanceTo(planet.position)).toBeCloseTo(focusDistance(1e-4), 10);
  });

  it('ignoriert negative Zeitschritte', () => {
    const { controller, focus } = setup();
    controller.focus(focus);
    controller.update(-10);
    expect(controller.mode).toBe('flying');
  });
});
