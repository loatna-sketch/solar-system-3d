/** Simulationsuhr: reine Zustandslogik, unabhängig von Rendering und DOM. */
export interface Clock {
  /** Aktuelles Julianisches Datum */
  jd: number;
  /** Simulierte Tage pro Echtzeit-Sekunde (Betrag) */
  rate: number;
  /** +1 vorwärts, −1 rückwärts */
  direction: 1 | -1;
  paused: boolean;
}

/**
 * Begrenzung des Frame-Zeitschritts: verhindert Zeitsprünge nach inaktivem Tab oder Breakpoint.
 * 0,25 s → die gewählte Geschwindigkeit stimmt bis hinunter zu 4 fps (Pi, Software-Rendering).
 */
export const MAX_DT_SECONDS = 0.25;

export function createClock(jd: number, rate = 1): Clock {
  return { jd, rate, direction: 1, paused: false };
}

export function tick(clock: Clock, dtSeconds: number): void {
  if (clock.paused) return;
  const dt = Math.min(Math.max(dtSeconds, 0), MAX_DT_SECONDS);
  clock.jd += clock.direction * clock.rate * dt;
}
