import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/** Bloom nur für HDR-helle Flächen (Sonne): Schwelle 1,0 – beleuchtete Planeten bleiben darunter */
export const BLOOM = { strength: 0.9, radius: 0.5, threshold: 1.0 };

export interface PostProcessing {
  render(): void;
  setSize(width: number, height: number): void;
}

/** Render → Bloom (intern ab halber Auflösung) → Output (sRGB-Konvertierung) */
export function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): PostProcessing {
  // Eigenes Target mit MSAA: Der Composer rendert nicht mehr direkt auf den Canvas, `antialias: true` greift dort nicht.
  // HalfFloat, damit die HDR-Sonne (> 1,0) den Bloom-Schwellwert erreicht.
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), BLOOM.strength, BLOOM.radius, BLOOM.threshold));
  composer.addPass(new OutputPass());
  return {
    render: () => composer.render(),
    setSize(width, height) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
    },
  };
}
