import * as THREE from 'three';
import { easeInOutCubic, fitDistance, focusDistance } from './cameraMath';

export interface FocusTarget {
  id: string;
  /** Objekt direkt unter der Szene; seine position ist die Weltposition */
  object: THREE.Object3D;
  /** Radius in Szenen-Einheiten; ändert sich mit dem Maßstab */
  radius: number;
}

export type CameraMode = 'overview' | 'flying' | 'following';

/** Blickrichtung der Übersicht: schräg von oben auf die Ekliptik */
const OVERVIEW_DIRECTION = new THREE.Vector3(0, 0.45, 0.89).normalize();

/**
 * Steuert Kamera und OrbitControls-Target: Flug zu einem Körper, anschließend Mitführen (Follow).
 * Bewusst ohne DOM und ohne OrbitControls-Abhängigkeit → in Node testbar.
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
  private readonly rotation = new THREE.Quaternion();
  private readonly partialRotation = new THREE.Quaternion();
  private readonly lastTargetPosition = new THREE.Vector3();
  private readonly goal = new THREE.Vector3();
  private readonly offset = new THREE.Vector3();
  private static readonly IDENTITY = new THREE.Quaternion();
  private static readonly ORIGIN = new THREE.Vector3();

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    /** Wird in-place verändert (OrbitControls.target) */
    private readonly target: THREE.Vector3,
    /** Radius der Kugel, die in der Übersicht vollständig sichtbar sein soll (ändert sich mit dem Maßstab) */
    private overviewRadius: number,
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
    this.camera.position.copy(this.target).add(this.offset.normalize().multiplyScalar(this.overviewDistance()));
  }

  /**
   * Nach einem Maßstabswechsel: Bildausschnitt erhalten. Kamera und Target werden gemeinsam um einen Bezugspunkt
   * skaliert (Follow: Körper, Übersicht: Ursprung), damit auch ein gepanntes Target relativ an seinem Platz bleibt.
   * Vor dem Setzen der neuen Positionen aufrufen: Im Follow ist der Bezugspunkt die alte Körperposition,
   * den Sprung zur neuen gleicht update() aus. focusRadiusRatio = neuer / alter Radius des fokussierten Körpers.
   * Ein laufender Flug passt sein Ziel selbst an.
   */
  rescale(overviewRadius: number, focusRadiusRatio: number): void {
    const overviewRatio = overviewRadius / this.overviewRadius;
    this.overviewRadius = overviewRadius;
    if (this.mode === 'flying') return;
    const followed = this.mode === 'following' ? this.focused : null;
    const anchor = followed ? followed.object.position : CameraController.ORIGIN;
    const ratio = followed ? focusRadiusRatio : overviewRatio;
    for (const v of [this.camera.position, this.target]) v.sub(anchor).multiplyScalar(ratio).add(anchor);
  }

  update(dtSeconds: number): void {
    if (this.mode === 'flying') {
      this.elapsed += Math.max(dtSeconds, 0);
      // Ziel-Abstand jedes Frame neu: Der Maßstab (und damit der Radius) kann sich während des Flugs ändern
      const endLength = this.focused ? focusDistance(this.focused.radius) : this.overviewDistance();
      const t = easeInOutCubic(this.elapsed / this.flightSeconds);
      // Ziel wird jedes Frame neu gelesen: Planeten bewegen sich während des Flugs weiter
      this.currentGoal(this.goal);
      this.target.lerpVectors(this.fromTarget, this.goal, t);
      this.partialRotation.slerpQuaternions(CameraController.IDENTITY, this.rotation, t);
      this.offset
        .copy(this.fromDirection)
        .applyQuaternion(this.partialRotation)
        .multiplyScalar(THREE.MathUtils.lerp(this.fromLength, endLength, t));
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
    // setFromUnitVectors wählt bei exakt entgegengesetzten Richtungen selbst eine Drehachse
    this.rotation.setFromUnitVectors(this.fromDirection, endOffset.clone().normalize());
    this.elapsed = 0;
    this.mode = 'flying';
  }

  private currentGoal(out: THREE.Vector3): THREE.Vector3 {
    return this.focused ? out.copy(this.focused.object.position) : out.set(0, 0, 0);
  }

  private overviewDistance(): number {
    return fitDistance(this.overviewRadius, this.camera.fov, this.camera.aspect);
  }

  private overviewOffset(): THREE.Vector3 {
    return OVERVIEW_DIRECTION.clone().multiplyScalar(this.overviewDistance());
  }
}
