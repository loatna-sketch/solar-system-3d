import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { bodies, type OrbitalElements } from './data/bodies';
import { sceneRadius, toScene } from './scale';
import { createBodyMesh, createOrbitLine, updateOrbitLine } from './scene/createBody';
import { createClock, tick } from './sim/clock';
import { heliocentricPosition, orbitPoints } from './sim/kepler';
import { dateToJd } from './sim/time';
import { createTimeControls } from './ui/timeControls';

/** Bahnelemente driften langsam; Bahnlinien werden nach so vielen Tagen Abweichung neu berechnet */
const ORBIT_REBUILD_DAYS = 50 * 365.25;

const container = document.getElementById('app')!;

const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.inset = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
container.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 10_000);
camera.position.set(0, 35, 70);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 3;
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
let orbitEpochJd = clock.jd;

const scenePoints = (orbit: OrbitalElements, jd: number) => orbitPoints(orbit, jd).map((p) => toScene(p));

for (const body of bodies) {
  const mesh = createBodyMesh(body, sceneRadius(body.radiusKm));
  scene.add(mesh);
  if (body.orbit) {
    const line = createOrbitLine(scenePoints(body.orbit, clock.jd));
    scene.add(line);
    orbiting.push({ orbit: body.orbit, mesh, line });
  }
}

function rebuildOrbits(): void {
  orbitEpochJd = clock.jd;
  for (const { orbit, line } of orbiting) updateOrbitLine(line, scenePoints(orbit, clock.jd));
}

const timeControls = createTimeControls(document.getElementById('time-controls')!, clock, rebuildOrbits);

function resize(): void {
  const { clientWidth: w, clientHeight: h } = container;
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

let lastFrameMs: number | undefined;
renderer.setAnimationLoop((timeMs: number) => {
  tick(clock, lastFrameMs === undefined ? 0 : (timeMs - lastFrameMs) / 1000);
  lastFrameMs = timeMs;

  if (Math.abs(clock.jd - orbitEpochJd) > ORBIT_REBUILD_DAYS) rebuildOrbits();
  for (const { orbit, mesh } of orbiting) {
    mesh.position.set(...toScene(heliocentricPosition(orbit, clock.jd)));
  }

  timeControls.update();
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});
