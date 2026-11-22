# Sonnensystem 3D

Interaktive 3D-Simulation des Sonnensystems im Browser – frei dreh- und erkundbar.
Stack: Three.js · TypeScript · Vite · Vitest · GitHub Actions/Pages.

![Sonnensystem 3D – Blick auf die Sonne](docs/screenshot.jpg)

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
- `src/sim/` – reine Simulationslogik ohne Three.js: Julianisches Datum (`time.ts`), Kepler-Bahnen (`kepler.ts`), Simulationsuhr (`clock.ts`), Orientierung/Eigenrotation (`rotation.ts`)
- `src/scale.ts` – einzige Stelle, die physikalische Größen auf Szenen-Einheiten abbildet (Achsentausch + komprimierter Maßstab)
- `src/scene/` – Three.js-Objekte (Körper, Ringe, Labels, Bahnlinien), Texturen, Bloom, Kamera-Steuerung (Fly-to/Follow), Picking, Label-Verdeckung
- `public/textures/` – 2k-Texturen (siehe Lizenz unten), geladen mit `scripts/fetch-textures.mjs`
- `src/ui/` – HTML-Overlays (Zeitsteuerung, Körperliste)

## Modell & Annahmen

- **Bahnen:** Kepler-Elemente aus JPL [*Approximate Positions of the Planets*](https://ssd.jpl.nasa.gov/planets/approx_pos.html), Tabelle 1 –
  gültig 1800–2050, Fehler laut JPL von ~10″ (Erde) bis ~600″ (Saturn). Außerhalb des Zeitraums zeigt die UI einen Hinweis.
  Erde = Erde-Mond-Baryzentrum.
- **Koordinaten:** heliozentrisch-ekliptikal J2000 in AU (z = Nord) → Three.js `(x, z, −y)`. Komprimiert wird nur der Sonnenabstand, die Richtung bleibt exakt.
- **Zeit:** Julianisches Datum; UTC wird als TDB behandelt (ΔT ≈ 69 s, vernachlässigbar).
- **Orientierung & Eigenrotation:** Pol (α₀, δ₀) und Nullmeridian W = W₀ + Ẇ·d nach IAU WGCCRE – Achsneigung, Jahreszeiten
  und Tageszeit stimmen (Erde: Sonnenhöchststand-Länge getestet). Vereinfachung: Pole ohne Präzession/Nutation.
  Rückläufige Rotation (Venus, Uranus) über negatives Ẇ.
- **Darstellung:** Bloom nur für die HDR-helle Sonne (Schwelle 1,0). Saturnringe in der Äquatorebene, Radien im selben
  Verhältnis skaliert wie der Planet. Sternenhimmel nur kosmetisch ausgerichtet.
- **Referenztest:** `src/sim/__fixtures__/horizons.json` enthält Positionen aus JPL Horizons
  (erzeugt mit `scripts/fetch-horizons.mjs`); `kepler.test.ts` prüft dagegen (< 0,25°, < 1 % Abstand).

## Bedienung

| Aktion | Eingabe |
|---|---|
| Körper fokussieren (Kamera fliegt hin und folgt) | Klick auf Planet oder Label · Liste oben links · Tasten `1`–`8`, `S` = Sonne |
| Zurück zur Übersicht | `Esc` oder `0` |
| Drehen / Zoomen / Verschieben | Ziehen · Rad/Pinch · Rechtsklick |
| Zeit Start/Pause | Leertaste |

Panel unten rechts: Richtung, Geschwindigkeit (Echtzeit … 1 Jahr/s), Datumssprung, „Heute“.

## Roadmap

- [x] M0 Grundgerüst: Vite/TS/Three.js, Lint, Tests, CI + Pages-Deploy
- [x] M1 Statisches Sonnensystem: Sonne + 8 Planeten, komprimierter Maßstab, Labels, OrbitControls
- [x] M2 Bahnmechanik: Kepler-Elemente (JPL), Zeit-Engine, Bahnellipsen, Tests gegen Horizons
- [x] M3 Navigation: Klick-Fokus, Fly-to, Follow (Floating Origin → M5, erst im realen Maßstab nötig)
- [x] M4 Visuals: Texturen, Rotation/Achsneigung, Saturnringe, Bloom, Skybox
- [ ] M5 Maßstab real ↔ komprimiert, Floating Origin
- [ ] M6 Monde, Zwergplaneten, Asteroidengürtel
- [ ] M7 Info-Panel, Touch, Performance
- [ ] M8 Stretch: VSOP87, Raumsonden, WebXR, N-Body-Sandbox

## Lizenz der Texturen

Texturen von [Solar System Scope](https://www.solarsystemscope.com/textures/),
lizenziert unter [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) – siehe `public/textures/ATTRIBUTION.md`.
