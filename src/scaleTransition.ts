import { easeInOutCubic } from './scene/cameraMath';

/**
 * Animierter Maßstabswechsel komprimiert (0) ↔ real (1).
 * progress läuft linear mit der Echtzeit, value ist geglättet und geht in blendScale ein.
 * Ein erneutes Umschalten mitten im Übergang kehrt ab dem aktuellen Stand um – ohne Sprung.
 */
export interface ScaleTransition {
  /** Linearer Fortschritt 0…1 */
  progress: number;
  /** Ziel: 0 = komprimiert, 1 = real */
  target: 0 | 1;
  /** Dauer eines vollständigen Wechsels in Sekunden (0 = sofort) */
  durationSeconds: number;
}

export function createScaleTransition(durationSeconds: number): ScaleTransition {
  return { progress: 0, target: 0, durationSeconds };
}

/** Geglätteter Überblendwert für blendScale */
export function transitionValue(s: ScaleTransition): number {
  return easeInOutCubic(s.progress);
}

export function toggleTarget(s: ScaleTransition): void {
  s.target = s.target === 1 ? 0 : 1;
}

/** Fortschritt um dt Sekunden Richtung Ziel bewegen; liefert true, wenn sich etwas geändert hat */
export function stepTransition(s: ScaleTransition, dtSeconds: number): boolean {
  if (s.progress === s.target) return false;
  const step = s.durationSeconds > 0 ? Math.max(dtSeconds, 0) / s.durationSeconds : 1;
  if (step === 0) return false;
  s.progress = s.target === 1 ? Math.min(1, s.progress + step) : Math.max(0, s.progress - step);
  return true;
}
