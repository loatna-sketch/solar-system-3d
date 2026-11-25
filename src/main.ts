import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { bodies, type BodyData, type OrbitalElements } from './data/bodies';
import {
  COMPRESSED,
  REAL,
  sceneDistance,
  sceneRadius,
  sceneExtent,
  toScene,
  toSceneDirection,
  type ScaleConfig,
} from './scale';
import { CameraController, type FocusTarget } from './scene/cameraController';
import { fitDistance, minZoomDistance } from './scene/cameraMath';
import { createBody, createOrbitLine, updateOrbitLine } from './scene/createBody';
import { isOccluded, type Sphere } from './scene/occlusion';
import { attachPicking, onPointerClick } from './scene/picking';
import { createPostProcessing } from './scene/postprocessing';
import { createTextureSource } from './scene/textures';
import { createClock, tick } from './sim/clock';
import { heliocentricPosition, orbitPoints } from './sim/kepler';
import { displayedMeridianDeg, orientationAtMeridian } from './sim/rotation';
import { dateToJd } from './sim/time';
import { createBodyList } from './ui/bodyList';
import { createScaleToggle } from './ui/scaleToggle';
import { createTimeControls } from './ui/timeControls';

/** Bahnelemente driften langsam; Bahnlinien werden nach so vielen Tagen Abweichung neu berechnet */
const ORBIT_REBUILD_DAYS = 50 * 365.25;
/** Größter Zoom-Abstand als Vielfaches des Übersichtsabstands */
const MAX_ZOOM_FACTOR = 4;
/**
 * Fest für beide Maßstäbe: Merkur hat real ≈ 1,3e-4 Einheiten Radius, die Kamera darf bis 0,5 R an die Oberfläche.
 * Der logarithmische Tiefenpuffer verkraftet far/near = 1e11.
 */
const CAMERA_NEAR = 1e-7;
const CAMERA_FAR = 1e4;

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
const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, CAMERA_NEAR, CAMERA_FAR);
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

// Sonne als einzige Lichtquelle; decay 0, damit äußere Planeten im komprimierten Maßstab sichtbar bleiben
scene.add(new THREE.PointLight(0xffffff, 3, 0, 0));
scene.add(new THREE.AmbientLight(0xffffff, 0.06));

const clock = createClock(dateToJd(new Date()), 7);

interface SceneBody {
  data: BodyData;
  root: THREE.Group;
  /** radius/extent werden bei jedem Maßstabswechsel aktualisiert */
  target: FocusTarget;
}
interface OrbitingBody {
  orbit: OrbitalElements;
  root: THREE.Group;
  line: THREE.LineLoop;
}
interface SpinningBody {
  body: BodyData;
  sphere: THREE.Mesh;
  /** Zuletzt angezeigter Nullmeridian-Winkel (Grad) */
  meridianDeg: number;
}

let scaleCfg: ScaleConfig = COMPRESSED;
const sceneBodies: SceneBody[] = [];
const orbiting: OrbitingBody[] = [];
const spinning: SpinningBody[] = [];
const pickTargets: THREE.Mesh[] = [];
const focusTargets = new Map<string, FocusTarget>();
let orbitEpochJd = clock.jd;
let overviewRadius = 0;

const scenePoints = (orbit: OrbitalElements, jd: number) => orbitPoints(orbit, jd).map((p) => toScene(p, scaleCfg));

for (const data of bodies) {
  const { root, sphere, pickables } = createBody(data, textures);
  scene.add(root);
  const target: FocusTarget = { id: data.id, object: root, radius: 0 };
  focusTargets.set(data.id, target);
  sceneBodies.push({ data, root, target });
  spinning.push({ body: data, sphere, meridianDeg: 0 });
  pickTargets.push(...pickables);
  if (data.orbit) {
    const line = createOrbitLine([]);
    scene.add(line);
    orbiting.push({ orbit: data.orbit, root, line });
  }
}

/** Radien, Ausdehnung (Ringe) und Übersichtsradius für den aktuellen Maßstab */
function applyRadii(): void {
  overviewRadius = 0;
  for (const { data, root, target } of sceneBodies) {
    target.radius = sceneRadius(data.radiusKm, scaleCfg);
    target.extent = sceneExtent(data, scaleCfg);
    root.scale.setScalar(target.radius);
    if (data.orbit) {
      const aphelion = data.orbit.a[0] * (1 + data.orbit.e[0]);
      overviewRadius = Math.max(overviewRadius, sceneDistance(aphelion, scaleCfg) + target.radius);
    }
  }
}

/** Labels, deren Anker hinter einem anderen Körper liegt, ausblenden (CSS-Labels kennen keinen Tiefenpuffer) */
const labelEntries = [...focusTargets.values()].flatMap((t) => {
  const label = t.object.children.find((c): c is CSS2DObject => c instanceof CSS2DObject);
  // center ist eine Referenz auf root.position → bleibt ohne Kopie aktuell
  // radius als Getter: ändert sich mit dem Maßstab
  const others: Sphere[] = [...focusTargets.values()]
    .filter((o) => o !== t)
    .map((o) => ({
      center: o.object.position,
      get radius() {
        return o.radius;
      },
    }));
  return label ? [{ root: t.object, label, others }] : [];
});
const labelAnchor = new THREE.Vector3();
function updateLabelVisibility(): void {
  for (const { root, label, others } of labelEntries) {
    // Direkt aus Position und Skalierung (matrixWorld wird erst beim Rendern aktualisiert); root rotiert nicht
    labelAnchor.copy(label.position).multiply(root.scale).add(root.position);
    label.visible = !isOccluded(camera.position, labelAnchor, others);
  }
}

function updatePositions(): void {
  for (const { orbit, root } of orbiting) {
    root.position.set(...toScene(heliocentricPosition(orbit, clock.jd), scaleCfg));
  }
}

/** Orientierung nach IAU: lokal X = Nullmeridian, Y = Nordpol, Z = X × Y (passt zur UV-Belegung der SphereGeometry) */
const axisX = new THREE.Vector3();
const axisY = new THREE.Vector3();
const axisZ = new THREE.Vector3();
const basis = new THREE.Matrix4();
function updateOrientations(dtSeconds: number): void {
  const simDaysPerSecond = clock.paused ? 0 : clock.direction * clock.rate;
  for (const s of spinning) {
    const { body, sphere } = s;
    s.meridianDeg = displayedMeridianDeg(body.rotation, clock.jd, simDaysPerSecond, s.meridianDeg, dtSeconds);
    const { meridian, pole } = orientationAtMeridian(body.pole, s.meridianDeg);
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

applyRadii();
rebuildOrbits();

// --- Kamera & Auswahl -------------------------------------------------------------------------

const cameraController = new CameraController(camera, controls.target, overviewRadius);

const sun = bodies.find((b) => b.type === 'star')!;
const sunTarget = focusTargets.get(sun.id)!;
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

attachPicking(renderer.domElement, camera, pickTargets, select);
// Labels: gleiche Klick-Erkennung wie auf dem Canvas, damit ein Drag, der auf einem Label beginnt, nichts auswählt
onPointerClick(labelRenderer.domElement, (e) => {
  const id = (e.target as HTMLElement).dataset?.id;
  if (id) select(id);
});

const timeControlsRoot = document.getElementById('time-controls')!;
const timeControls = createTimeControls(timeControlsRoot, clock, () => {
  rebuildOrbits();
  updatePositions();
});
const scaleToggle = createScaleToggle(timeControlsRoot, () => setScale(scaleCfg === REAL ? COMPRESSED : REAL));
scaleToggle.setReal(false);

/** Maßstab sofort wechseln; der Bildausschnitt relativ zum Fokus bleibt erhalten */
function setScale(cfg: ScaleConfig): void {
  const focused = cameraController.focused;
  const oldRadius = focused?.radius ?? 1;
  scaleCfg = cfg;
  applyRadii();
  rebuildOrbits();
  cameraController.rescale(overviewRadius, focused ? focused.radius / oldRadius : 1);
  updatePositions();
  scaleToggle.setReal(cfg === REAL);
}

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
updateOrientations(0);
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
  updateOrientations(dt);

  // Reihenfolge: erst Positionen, dann Kamera mitführen, dann Nutzereingaben (OrbitControls)
  cameraController.update(dt);
  controls.enabled = !cameraController.isFlying;
  const focused = cameraController.focused;
  // Fokus: Ringe einbeziehen; Übersicht: knapp außerhalb der Sonne
  controls.minDistance = minZoomDistance(focused ? (focused.extent ?? focused.radius) : sunTarget.radius);
  controls.maxDistance = MAX_ZOOM_FACTOR * fitDistance(overviewRadius, camera.fov, camera.aspect);
  // Während des Flugs nicht: update() würde auf minDistance klemmen und Rest-Damping anwenden
  if (!cameraController.isFlying) controls.update();
  else camera.lookAt(controls.target);

  timeControls.update();
  updateLabelVisibility();
  postProcessing.render();
  labelRenderer.render(scene, camera);
});
