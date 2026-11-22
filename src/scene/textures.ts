import * as THREE from 'three';

export type TextureSource = (file: string) => Promise<THREE.Texture>;

/** Lädt Farbtexturen aus public/textures/ (sRGB, anisotrope Filterung für schräge Blickwinkel) */
export function createTextureSource(renderer: THREE.WebGLRenderer): TextureSource {
  const loader = new THREE.TextureLoader();
  const base = `${import.meta.env.BASE_URL}textures/`;
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return async (file) => {
    const texture = await loader.loadAsync(base + file);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;
    return texture;
  };
}
