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

export interface BodyData {
  id: string;
  /** Anzeigename (deutsch) */
  name: string;
  type: BodyType;
  /** Mittlerer Radius in km */
  radiusKm: number;
  /** Platzhalterfarbe bis zu den Texturen (M4) */
  color: string;
  /** Heliozentrische Bahn; fehlt bei der Sonne */
  orbit?: OrbitalElements;
}

export const bodies = raw as BodyData[];
