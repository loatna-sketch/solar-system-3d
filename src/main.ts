import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { bodies, type OrbitalElements } from './data/bodies';
import { sceneDistance, sceneRadius, toScene } from './scale';
import { CameraController, type FocusTarget } from './scene/cameraController';
import { minZoomDistance } from './scene/cameraMath';
import { createBodyMesh, createOrbitLine, updateOrbitLine } from './scene/createBody';
import { isOccluded, type Sphere } from './scene/occlusion';
import { attachPicking } from './scene/picking';
import { createClock, tick } from './sim/clock';
import { heliocentricPosition, orbitPoints } from './sim/kepler';
import { dateToJd } from './sim/time';
import { createBodyList } from './ui/bodyList';
import { createTimeControls } from './ui/timeControls';

/** Bahnelemente driften langsam; Bahnlinien werden nach so vielen Tagen Abweichung neu berechnet */
const ORBIT_REBUILD_DAYS = 50 * 365.25;
/** Zoom-Grenze in der Übersicht (knapp außerhalb der Sonne) */
const OVERVIEW_MIN_DISTANCE = 3;

const container = document.getElementById('app')!;

const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.inset = '0';
labelRenderer.domElement.style.pointerEvents = 'none'; // Labels selbst sind klickbar (CSS)
container.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.01, 10_000);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxDistance = 400;

// Sonne als einzige Lichtquelle; decay 0, damit äußere Planeten im komprimierten Maßstab sichtbar bleiben
scene.add(new THREE.PointLight(0xffffff, 3, 0, 0));
scene.add(new THREE.AmbientLight(0xffffff, 0.06));

const clock = createClock(dateToJd(new Date()), 7);

interface OrbitingBody {
  orbit: OrbitalElements;
  mesh: THREE.Mesh;
  line: THREE.LineLoop;
}
const orbiting: OrbitingBody[] = [];
const focusTargets = new Map<string, FocusTarget>();
let orbitEpochJd = clock.jd;
let overviewRadius = 0;

const scenePoints = (orbit: OrbitalElements, jd: number) => orbitPoints(orbit, jd).map((p) => toScene(p));

for (const body of bodies) {
  const radius = sceneRadius(body.radiusKm);
  const mesh = createBodyMesh(body, radius);
  scene.add(mesh);
  focusTargets.set(body.id, { id: body.id, object: mesh, radius });
  if (body.orbit) {
    const line = createOrbitLine(scenePoints(body.orbit, clock.jd));
    scene.add(line);
    orbiting.push({ orbit: body.orbit, mesh, line });
    const aphelion = body.orbit.a[0] * (1 + body.orbit.e[0]);
    overviewRadius = Math.max(overviewRadius, sceneDistance(aphelion) + radius);
  }
}

/** Labels, deren Anker hinter einem anderen Körper liegt, ausblenden (CSS-Labels kennen keinen Tiefenpuffer) */
const labelAnchor = new THREE.Vector3();
function updateLabelVisibility(): void {
  for (const self of focusTargets.values()) {
    const label = self.object.children.find((c): c is CSS2DObject => c instanceof CSS2DObject);
    if (!label) continue;
    // Direkt aus der aktuellen Position (matrixWorld wird erst beim Rendern aktualisiert)
    labelAnchor.copy(self.object.position).add(label.position);
    const others: Sphere[] = [];
    for (const t of focusTargets.values()) if (t !== self) others.push({ center: t.object.position, radius: t.radius });
    label.visible = !isOccluded(camera.position, labelAnchor, others);
  }
}

function updatePositions(): void {
  for (const { orbit, mesh } of orbiting) {
    mesh.position.set(...toScene(heliocentricPosition(orbit, clock.jd)));
  }
}

function rebuildOrbits(): void {
  orbitEpochJd = clock.jd;
  for (const { orbit, line } of orbiting) updateOrbitLine(line, scenePoints(orbit, clock.jd));
}

// --- Kamera & Auswahl -------------------------------------------------------------------------

const cameraController = new CameraController(camera, controls.target, overviewRadius);

const sun = bodies.find((b) => b.type === 'star')!;
const bodyList = createBodyList(
  document.getElementById('body-list')!,
  sun,
  bodies.filter((b) => b.type === 'planet'),
  select,
);

function select(id: string | null): void {
  const target = id ? focusTargets.get(id) : undefined;
  if (target) cameraController.focus(target);
  else cameraController.overview();
  bodyList.setActive(target ? target.id : null);
}

attachPicking(renderer.domElement, camera, [...focusTargets.values()].map((t) => t.object), select);
labelRenderer.domElement.addEventListener('click', (e) => {
  const id = (e.target as HTMLElement).dataset?.id;
  if (id) select(id);
});

const timeControls = createTimeControls(document.getElementById('time-controls')!, clock, () => {
  rebuildOrbits();
  updatePositions();
});

function resize(): void {
  const { clientWidth: w, clientHeight: h } = container;
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

updatePositions();
cameraController.snapToOverview();
bodyList.setActive(null);

// --- Hauptschleife ---------------------------------------------------------------------------

let lastFrameMs: number | undefined;
renderer.setAnimationLoop((timeMs: number) => {
  const dt = lastFrameMs === undefined ? 0 : (timeMs - lastFrameMs) / 1000;
  lastFrameMs = timeMs;

  tick(clock, dt);
  if (Math.abs(clock.jd - orbitEpochJd) > ORBIT_REBUILD_DAYS) rebuildOrbits();
  updatePositions();

  // Reihenfolge: erst Positionen, dann Kamera mitführen, dann Nutzereingaben (OrbitControls)
  cameraController.update(dt);
  controls.enabled = !cameraController.isFlying;
  const focused = cameraController.focused;
  controls.minDistance = focused ? minZoomDistance(focused.radius) : OVERVIEW_MIN_DISTANCE;
  controls.update();

  timeControls.update();
  updateLabelVisibility();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});
