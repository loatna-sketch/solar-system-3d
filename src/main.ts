import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { bodies } from './data/bodies';
import { sceneDistance, sceneRadius } from './scale';
import { placeholderPosition } from './layout';
import { createBodyMesh, createOrbitLine } from './scene/createBody';

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

bodies.forEach((body, index) => {
  const mesh = createBodyMesh(body, sceneRadius(body.radiusKm));
  if (body.type !== 'star') {
    const distance = sceneDistance(body.semiMajorAxisAu);
    const { x, z } = placeholderPosition(index, distance);
    mesh.position.set(x, 0, z);
    scene.add(createOrbitLine(distance));
  }
  scene.add(mesh);
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

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});
