import * as THREE from 'three';
import { easeInOutCubic, fitDistance, focusDistance } from './cameraMath';

export interface FocusTarget {
  id: string;
  /** Objekt direkt unter der Szene; seine position ist die Weltposition */
  object: THREE.Object3D;
  radius: number;
}

export type CameraMode = 'overview' | 'flying' | 'following';

/** Blickrichtung der Übersicht: schräg von oben auf die Ekliptik */
const OVERVIEW_DIRECTION = new THREE.Vector3(0, 0.45, 0.89).normalize();

/**
 * Steuert Kamera und OrbitControls-Target: Flug zu einem Körper, anschließend Mitführen (Follow).
 * Bewusst ohne DOM und ohne OrbitControls-Abhängigkeit → in Node testbar.
 * Floating Origin (M5) kann hier zentral ergänzt werden.
 */
export class CameraController {
  mode: CameraMode = 'overview';
  focused: FocusTarget | null = null;

  private elapsed = 0;
  private readonly fromTarget = new THREE.Vector3();
  /**
   * Der Kamera-Offset (Kamera − Target) wird sphärisch interpoliert: Richtung per Slerp, Länge linear.
   * Ein lineares Mischen beider Offsets könnte durch null laufen (Kamera fliegt durch ihr Target).
   */
  private readonly fromDirection = new THREE.Vector3();
  private fromLength = 0;
  private endLength = 0;
  private readonly rotation = new THREE.Quaternion();
  private readonly partialRotation = new THREE.Quaternion();
  private readonly lastTargetPosition = new THREE.Vector3();
  private readonly goal = new THREE.Vector3();
  private readonly offset = new THREE.Vector3();
  private static readonly IDENTITY = new THREE.Quaternion();

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    /** Wird in-place verändert (OrbitControls.target) */
    private readonly target: THREE.Vector3,
    /** Radius der Kugel, die in der Übersicht vollständig sichtbar sein soll */
    private readonly overviewRadius: number,
    private readonly flightSeconds = 1.2,
  ) {}

  get isFlying(): boolean {
    return this.mode === 'flying';
  }

  /** Übersicht ohne Animation (Startansicht) */
  snapToOverview(): void {
    this.focused = null;
    this.mode = 'overview';
    this.target.set(0, 0, 0);
    this.camera.position.copy(this.overviewOffset());
  }

  focus(focusTarget: FocusTarget): void {
    const position = focusTarget.object.position;
    // Aus der aktuellen Blickrichtung anfliegen, damit der Flug möglichst geradlinig ist
    const direction = this.camera.position.clone().sub(position);
    if (direction.lengthSq() === 0) direction.copy(OVERVIEW_DIRECTION);
    this.focused = focusTarget;
    this.startFlight(direction.normalize().multiplyScalar(focusDistance(focusTarget.radius)));
  }

  overview(): void {
    this.focused = null;
    this.startFlight(this.overviewOffset());
  }

  /** Nach Größenänderung: Übersichtsabstand neu anpassen, Blickrichtung des Nutzers beibehalten */
  refitOverview(): void {
    if (this.mode !== 'overview') return;
    this.offset.subVectors(this.camera.position, this.target);
    if (this.offset.lengthSq() === 0) this.offset.copy(OVERVIEW_DIRECTION);
    const distance = fitDistance(this.overviewRadius, this.camera.fov, this.camera.aspect);
    this.camera.position.copy(this.target).add(this.offset.normalize().multiplyScalar(distance));
  }

  update(dtSeconds: number): void {
    if (this.mode === 'flying') {
      this.elapsed += Math.max(dtSeconds, 0);
      const t = easeInOutCubic(this.elapsed / this.flightSeconds);
      // Ziel wird jedes Frame neu gelesen: Planeten bewegen sich während des Flugs weiter
      this.currentGoal(this.goal);
      this.target.lerpVectors(this.fromTarget, this.goal, t);
      this.partialRotation.slerpQuaternions(CameraController.IDENTITY, this.rotation, t);
      this.offset
        .copy(this.fromDirection)
        .applyQuaternion(this.partialRotation)
        .multiplyScalar(THREE.MathUtils.lerp(this.fromLength, this.endLength, t));
      this.camera.position.copy(this.target).add(this.offset);
      if (this.elapsed >= this.flightSeconds) {
        this.mode = this.focused ? 'following' : 'overview';
        this.lastTargetPosition.copy(this.goal);
      }
    } else if (this.mode === 'following' && this.focused) {
      const delta = this.focused.object.position.clone().sub(this.lastTargetPosition);
      this.camera.position.add(delta);
      this.target.add(delta);
      this.lastTargetPosition.copy(this.focused.object.position);
    }
  }

  private startFlight(endOffset: THREE.Vector3): void {
    this.fromTarget.copy(this.target);
    this.offset.subVectors(this.camera.position, this.target);
    this.fromLength = this.offset.length();
    this.fromDirection.copy(this.fromLength > 0 ? this.offset.divideScalar(this.fromLength) : OVERVIEW_DIRECTION);
    this.endLength = endOffset.length();
    // setFromUnitVectors wählt bei exakt entgegengesetzten Richtungen selbst eine Drehachse
    this.rotation.setFromUnitVectors(this.fromDirection, endOffset.clone().normalize());
    this.elapsed = 0;
    this.mode = 'flying';
  }

  private currentGoal(out: THREE.Vector3): THREE.Vector3 {
    return this.focused ? out.copy(this.focused.object.position) : out.set(0, 0, 0);
  }

  private overviewOffset(): THREE.Vector3 {
    const distance = fitDistance(this.overviewRadius, this.camera.fov, this.camera.aspect);
    return OVERVIEW_DIRECTION.clone().multiplyScalar(distance);
  }
}
