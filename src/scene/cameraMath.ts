const DEG = Math.PI / 180;

export function easeInOutCubic(t: number): number {
  const x = Math.min(Math.max(t, 0), 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Kamera-Abstand, bei dem eine Kugel mit `radius` vollständig ins Bild passt – horizontal und vertikal.
 * Der Sichtkegel muss die Kugel tangential umschließen: d = r / sin(halber Öffnungswinkel).
 */
export function fitDistance(radius: number, fovYDeg: number, aspect: number, margin = 1.05): number {
  const halfV = (fovYDeg / 2) * DEG;
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  return (radius * margin) / Math.sin(Math.min(halfV, halfH));
}

/** Betrachtungsabstand beim Fokussieren eines Körpers */
export function focusDistance(bodyRadius: number): number {
  return bodyRadius * 6;
}

/** Kleinster Zoom-Abstand zum fokussierten Körper */
export function minZoomDistance(bodyRadius: number): number {
  return bodyRadius * 1.5;
}
