# Sonnensystem 3D

Interaktive 3D-Simulation des Sonnensystems im Browser – frei dreh- und erkundbar.
Stack: Three.js · TypeScript · Vite · Vitest · GitHub Actions/Pages.

![M1 – statisches Sonnensystem](docs/screenshot-m1.png)

## Entwicklung

```bash
npm ci
npm run dev      # Dev-Server
npm test         # Unit-Tests
npm run lint
npm run build    # Typecheck + Produktions-Build nach dist/
```

## Architektur

- `src/data/bodies.json` – Himmelskörper als Daten (Radius, Kepler-Bahnelemente mit Änderungsraten)
- `src/sim/` – reine Simulationslogik ohne Three.js: Julianisches Datum (`time.ts`), Kepler-Bahnen (`kepler.ts`), Simulationsuhr (`clock.ts`)
- `src/scale.ts` – einzige Stelle, die physikalische Größen auf Szenen-Einheiten abbildet (Achsentausch; Maßstab komprimiert/real als Potenzgesetz)
- `src/scene/` – Three.js-Objekte (Körper, Labels, Bahnlinien), Kamera-Steuerung (Fly-to/Follow), Picking, Label-Verdeckung
- `src/ui/` – HTML-Overlays (Zeitsteuerung, Maßstab, Körperliste)

## Modell & Annahmen

- **Bahnen:** Kepler-Elemente aus JPL [*Approximate Positions of the Planets*](https://ssd.jpl.nasa.gov/planets/approx_pos.html), Tabelle 1 –
  gültig 1800–2050, Fehler laut JPL von ~10″ (Erde) bis ~600″ (Saturn). Außerhalb des Zeitraums zeigt die UI einen Hinweis.
  Erde = Erde-Mond-Baryzentrum.
- **Koordinaten:** heliozentrisch-ekliptikal J2000 in AU (z = Nord) → Three.js `(x, z, −y)`. Komprimiert wird nur der Sonnenabstand, die Richtung bleibt exakt.
- **Maßstab:** komprimiert = Potenzgesetz (Radien r^0,4, Abstände r^0,5); real = linear, Radien und Abstände in derselben Einheit.
  In beiden gilt 1 AU = 8 Szenen-Einheiten. Details und Präzisionsüberlegungen: [`docs/plan-m5.md`](docs/plan-m5.md).
- **Zeit:** Julianisches Datum; UTC wird als TDB behandelt (ΔT ≈ 69 s, vernachlässigbar).
- **Referenztest:** `src/sim/__fixtures__/horizons.json` enthält Positionen aus JPL Horizons
  (erzeugt mit `scripts/fetch-horizons.mjs`); `kepler.test.ts` prüft dagegen (< 0,25°, < 1 % Abstand).

## Bedienung

| Aktion | Eingabe |
|---|---|
| Körper fokussieren (Kamera fliegt hin und folgt) | Klick auf Planet oder Label · Liste oben links · Tasten `1`–`8`, `S` = Sonne |
| Zurück zur Übersicht | `Esc` oder `0` |
| Drehen / Zoomen / Verschieben | Ziehen · Rad/Pinch · Rechtsklick |
| Zeit Start/Pause | Leertaste |
| Maßstab komprimiert ↔ real | `M` · Button im Panel |

Panel unten rechts: Richtung, Geschwindigkeit (Echtzeit … 1 Jahr/s), Datumssprung, „Heute“.

## Roadmap

- [x] M0 Grundgerüst: Vite/TS/Three.js, Lint, Tests, CI + Pages-Deploy
- [x] M1 Statisches Sonnensystem: Sonne + 8 Planeten, komprimierter Maßstab, Labels, OrbitControls
- [x] M2 Bahnmechanik: Kepler-Elemente (JPL), Zeit-Engine, Bahnellipsen, Tests gegen Horizons
- [x] M3 Navigation: Klick-Fokus, Fly-to, Follow (Floating Origin → M5, erst im realen Maßstab nötig)
- [ ] M4 Visuals: Texturen, Rotation/Achsneigung, Saturnringe, Bloom, Skybox
- [ ] M5 Maßstab real ↔ komprimiert, Floating Origin — M5.1 Umschalter ✓, M5.2 animierter Übergang, M5.3 Präzision (Bahnlinien, kamerarelatives Rendern)
- [ ] M6 Monde, Zwergplaneten, Asteroidengürtel
- [ ] M7 Info-Panel, Touch, Performance
- [ ] M8 Stretch: VSOP87, Raumsonden, WebXR, N-Body-Sandbox
