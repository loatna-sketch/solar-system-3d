/**
 * M1-Platzhalter: verteilt die Planeten im Goldenen Winkel auf ihren Kreisbahnen,
 * damit sie nicht auf einer Linie liegen. Wird in M2 durch echte Kepler-Positionen ersetzt.
 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export function placeholderPosition(index: number, distance: number): { x: number; z: number } {
  const angle = index * GOLDEN_ANGLE;
  return { x: distance * Math.cos(angle), z: -distance * Math.sin(angle) };
}
