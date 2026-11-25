# M5 – Maßstab real ↔ komprimiert, Floating Origin

## Kernbefund

Three.js berechnet `modelViewMatrix = camera.matrixWorldInverse × object.matrixWorld` auf der CPU in double;
erst das (kamerarelative) Ergebnis geht als float32 an die GPU. Meshes zittern daher auch weit weg vom Ursprung nicht.
Probleme im realen Maßstab (1 AU = 8 Einheiten, Neptun-Radius ≈ 1,3e-4 … 1,3e-3):

| Problem | Lösung |
|---|---|
| Bahnlinien-Vertices heliozentrisch in float32 (Fehler ≈ 1 % R_Neptun) | Vertices relativ zu einem Anker nahe der Kamera, `line.position = anker` (M5.3) |
| 256 Segmente → Sagitta beim Neptun ≈ 13 R, Linie verfehlt den Planeten | 4096 Segmente → Sagitta < 0,1 R für alle Planeten (M5.3) |
| near/far, min/max-Zoom fest verdrahtet | near 1e-7, far 1e4 (Log-Tiefenpuffer); Zoom-Grenzen aus dem Maßstab (M5.1 ✓) |

Floating Origin im engeren Sinn (kamerarelatives Rendern: Szene-Root und Kamera vor dem Render um −cameraWorld verschieben)
wird erst nötig, wenn Shader `modelMatrix`/`viewMatrix`/`cameraPosition` nutzen (M4: Atmosphäre, Schatten) → M5.3.

## Inkremente

- **M5.1 ✓** Spike + Maßstab als Laufzeitzustand: `REAL`, `blendScale` (Log-Raum), Radius über `root.scale` (Kugel und Ringe in Körperradien),
  `CameraController.rescale`, Flug-Zielabstand pro Frame, sofortiges Umschalten (Taste M / Button).
- **M5.2 ✓** Animierter Übergang (~2 s) über `blendScale(COMPRESSED, REAL, t)`: pro Frame Radien, Bahnlinien
  (8 × N × `toScene`), `rescale` mit Radius-Verhältnis zum Vorframe. Tests: Abstand/Radius bleibt konstant.
  Umgesetzt: `scaleTransition.ts` (linearer Fortschritt, geglätteter Wert, Umkehr ohne Sprung, Dauer 0 bei
  `prefers-reduced-motion`); Bahnlinien-Puffer werden in-place aktualisiert.
- **M5.3** Präzision: `anchorPoints(points64, anchor) → Float32Array`, Neubau bei Drift; 4096 Segmente;
  `renderWithOrigin()`. Tests: float32-Fehler nahe Anker < 1e-3 R (Neptun), max. Sagitta < 0,1 R (REAL).

## Spike-Ergebnis (M5.1, Playwright/SwiftShader, 1000×650)

- Mesh-Jitter: Planetenmittelpunkt beim Drehen um das Target – Streuung ≤ 1,5 px bei Erde und Neptun,
  in beiden Maßstäben gleich (Ursache: wandernde Terminator-Kante, kein Präzisionsfehler). → kein FO für Meshes nötig.
- Bahnlinie bei Neptun (real, Fokus) nicht sichtbar – bestätigt das Sagitta-Problem → M5.3.
- near = 1e-7 auch im komprimierten Maßstab ohne Tiefenartefakte.
- Reale Übersicht: Labels der inneren Planeten überlappen (erwartet; ggf. M7).
- Bekannte Einschränkung: Panning und sofort M → OrbitControls-Damping wendet den Rest-Pan noch einige Frames
  in alten Einheiten an (Target driftet kurz). Kamera/Target selbst werden beim Umschalten um den Fokus skaliert.
