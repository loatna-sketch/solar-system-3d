import raw from './bodies.json';

export type BodyType = 'star' | 'planet';

/** [Wert zur Epoche J2000, Änderung pro julianischem Jahrhundert] */
export type ElementWithRate = [number, number];

/**
 * Kepler-Bahnelemente nach JPL "Approximate Positions of the Planets", Tabelle 1 (gültig 1800–2050).
 * Bezugssystem: Ekliptik und Äquinoktium J2000. Winkel in Grad, a in AU.
 */
export interface OrbitalElements {
  /** Große Halbachse */
  a: ElementWithRate;
  /** Exzentrizität */
  e: ElementWithRate;
  /** Inklination */
  I: ElementWithRate;
  /** Mittlere Länge */
  L: ElementWithRate;
  /** Länge des Perihels ϖ */
  longPeri: ElementWithRate;
  /** Länge des aufsteigenden Knotens Ω */
  longNode: ElementWithRate;
}

/** Nordpol-Richtung nach IAU (WGCCRE), ICRF/J2000, in Grad */
export interface PoleOrientation {
  ra: number;
  dec: number;
}

/**
 * Nullmeridian nach IAU: W = w0 + rate · d (Grad, d = Tage seit J2000).
 * rate < 0 = rückläufige Rotation (Venus, Uranus); der IAU-Nordpol liegt immer auf der Nordseite der invariablen Ebene.
 */
export interface RotationModel {
  w0: number;
  rate: number;
}

export interface RingData {
  innerKm: number;
  outerKm: number;
  /** Radialer Streifen (u = innen → außen) mit Alphakanal */
  texture: string;
}

export interface BodyData {
  id: string;
  /** Anzeigename (deutsch) */
  name: string;
  type: BodyType;
  /** Mittlerer Radius in km */
  radiusKm: number;
  /** Grundfarbe, solange die Textur lädt oder falls sie fehlt */
  color: string;
  /** Dateiname in public/textures/ (equirektangular, Länge 0° in der Bildmitte) */
  texture: string;
  pole: PoleOrientation;
  rotation: RotationModel;
  rings?: RingData;
  /** Heliozentrische Bahn; fehlt bei der Sonne */
  orbit?: OrbitalElements;
}

export const bodies = raw as BodyData[];
