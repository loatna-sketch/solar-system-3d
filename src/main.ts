import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { bodies, type BodyData, type OrbitalElements } from './data/bodies';
import { sceneDistance, sceneRadius, toScene, toSceneDirection } from './scale';
import { CameraController, type FocusTarget } from './scene/cameraController';
import { minZoomDistance } from './scene/cameraMath';
import { createBody, createOrbitLine, updateOrbitLine } from './scene/createBody';
import { isOccluded, type Sphere } from './scene/occlusion';
import { attachPicking, onPointerClick } from './scene/picking';
import { createPostProcessing } from './scene/postprocessing';
import { createTextureSource } from './scene/textures';
import { createClock, tick } from './sim/clock';
import { heliocentricPosition, orbitPoints } from './sim/kepler';
import { orientationEcliptic } from './sim/rotation';
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
const postProcessing = createPostProcessing(renderer, scene, camera);
const textures = createTextureSource(renderer);

// Sternenhimmel: Ausrichtung kosmetisch (Koordinatensystem der Karte nicht dokumentiert)
textures('2k_stars_milky_way.jpg')
  .then((texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
    scene.backgroundIntensity = 0.45;
  })
  .catch((err) => console.warn('Sternenhimmel nicht geladen', err));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxDistance = 400;

// Sonne als einzige Lichtquelle; decay 0, damit äußere Planeten im komprimierten Maßstab sichtbar bleiben
scene.add(new THREE.PointLight(0xffffff, 3, 0, 0));
scene.add(new THREE.AmbientLight(0xffffff, 0.06));

const clock = createClock(dateToJd(new Date()), 7);

interface OrbitingBody {
  orbit: OrbitalElements;
  root: THREE.Group;
  line: THREE.LineLoop;
}
interface SpinningBody {
  body: BodyData;
  sphere: THREE.Mesh;
}
const orbiting: OrbitingBody[] = [];
const spinning: SpinningBody[] = [];
const focusTargets = new Map<string, FocusTarget>();
let orbitEpochJd = clock.jd;
let overviewRadius = 0;

const scenePoints = (orbit: OrbitalElements, jd: number) => orbitPoints(orbit, jd).map((p) => toScene(p));

for (const body of bodies) {
  const radius = sceneRadius(body.radiusKm);
  const { root, sphere } = createBody(body, radius, textures);
  scene.add(root);
  focusTargets.set(body.id, { id: body.id, object: root, radius });
  spinning.push({ body, sphere });
  if (body.orbit) {
    const line = createOrbitLine(scenePoints(body.orbit, clock.jd));
    scene.add(line);
    orbiting.push({ orbit: body.orbit, root, line });
    const aphelion = body.orbit.a[0] * (1 + body.orbit.e[0]);
    overviewRadius = Math.max(overviewRadius, sceneDistance(aphelion) + radius);
  }
}

/** Labels, deren Anker hinter einem anderen Körper liegt, ausblenden (CSS-Labels kennen keinen Tiefenpuffer) */
const labelEntries = [...focusTargets.values()].flatMap((t) => {
  const label = t.object.children.find((c): c is CSS2DObject => c instanceof CSS2DObject);
  // center ist eine Referenz auf root.position → bleibt ohne Kopie aktuell
  const others: Sphere[] = [...focusTargets.values()]
    .filter((o) => o !== t)
    .map((o) => ({ center: o.object.position, radius: o.radius }));
  return label ? [{ root: t.object, label, others }] : [];
});
const labelAnchor = new THREE.Vector3();
function updateLabelVisibility(): void {
  for (const { root, label, others } of labelEntries) {
    // Direkt aus der aktuellen Position (matrixWorld wird erst beim Rendern aktualisiert)
    labelAnchor.copy(root.position).add(label.position);
    label.visible = !isOccluded(camera.position, labelAnchor, others);
  }
}

function updatePositions(): void {
  for (const { orbit, root } of orbiting) {
    root.position.set(...toScene(heliocentricPosition(orbit, clock.jd)));
  }
}

/** Orientierung nach IAU: lokal X = Nullmeridian, Y = Nordpol, Z = X × Y (passt zur UV-Belegung der SphereGeometry) */
const axisX = new THREE.Vector3();
const axisY = new THREE.Vector3();
const axisZ = new THREE.Vector3();
const basis = new THREE.Matrix4();
function updateOrientations(): void {
  for (const { body, sphere } of spinning) {
    const { meridian, pole } = orientationEcliptic(body.pole, body.rotation, clock.jd);
    axisX.set(...toSceneDirection(meridian));
    axisY.set(...toSceneDirection(pole));
    axisZ.crossVectors(axisX, axisY);
    sphere.quaternion.setFromRotationMatrix(basis.makeBasis(axisX, axisY, axisZ));
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

attachPicking(renderer.domElement, camera, spinning.map((s) => s.sphere), select);
// Labels: gleiche Klick-Erkennung wie auf dem Canvas, damit ein Drag, der auf einem Label beginnt, nichts auswählt
onPointerClick(labelRenderer.domElement, (e) => {
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
  postProcessing.setSize(w, h);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  cameraController.refitOverview();
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
  updateOrientations();

  // Reihenfolge: erst Positionen, dann Kamera mitführen, dann Nutzereingaben (OrbitControls)
  cameraController.update(dt);
  controls.enabled = !cameraController.isFlying;
  const focused = cameraController.focused;
  controls.minDistance = focused ? minZoomDistance(focused.radius) : OVERVIEW_MIN_DISTANCE;
  // Während des Flugs nicht: update() würde auf minDistance klemmen und Rest-Damping anwenden
  if (!cameraController.isFlying) controls.update();
  else camera.lookAt(controls.target);

  timeControls.update();
  updateLabelVisibility();
  postProcessing.render();
  labelRenderer.render(scene, camera);
});
