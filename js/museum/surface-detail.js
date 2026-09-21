import * as T from '../../vendor/three.module.js';

// Deterministic microstructure for materials; never applied to photographs.
export function createSurfaceDetail(own) {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  let seed = 17421;
  for (let i = 0; i < size * size; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = 150 + (seed >>> 24) * 0.35;
    pixels.set([value, value, value, 255], i * 4);
  }
  const texture = own(new T.DataTexture(pixels, size, size, T.RGBAFormat));
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.magFilter = T.LinearFilter;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.repeat.set(3, 3);
  texture.needsUpdate = true;
  return texture;
}
