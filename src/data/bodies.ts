import raw from './bodies.json';

export type BodyType = 'star' | 'planet';

export interface BodyData {
  id: string;
  /** Anzeigename (deutsch) */
  name: string;
  type: BodyType;
  /** Mittlerer Radius in km */
  radiusKm: number;
  /** Große Halbachse in AU (J2000, JPL "Approximate Positions of the Planets"); 0 für die Sonne */
  semiMajorAxisAu: number;
  /** Platzhalterfarbe bis zu den Texturen (M4) */
  color: string;
}

export const bodies = raw as BodyData[];
