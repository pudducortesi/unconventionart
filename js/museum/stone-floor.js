import * as T from '../../vendor/three.module.js';
import { createPalazzoMarbleData } from './palazzo-marble-data.js';

// Shared PBR maps for one full-width 10 x 13 m palace bay. Only the promenade
// uses polychrome marble; every gallery keeps its existing mosaic parquet.
export function createStoneFloor(own, anisotropy) {
  const { size, colour, normal, roughness } = createPalazzoMarbleData();
  const texture = (data, colorSpace = T.NoColorSpace) => {
    const map = own(new T.DataTexture(data, size, size, T.RGBAFormat));
    map.colorSpace = colorSpace;
    map.wrapS = map.wrapT = T.RepeatWrapping;
    map.magFilter = T.LinearFilter;
    map.minFilter = T.LinearMipmapLinearFilter;
    map.generateMipmaps = true;
    map.anisotropy = anisotropy;
    map.needsUpdate = true;
    return map;
  };
  return own(new T.MeshPhysicalMaterial({
    map: texture(colour, T.SRGBColorSpace), normalMap: texture(normal),
    roughnessMap: texture(roughness), color: 0xffffff, roughness: 1,
    metalness: 0, clearcoat: .8, clearcoatRoughness: .14
  }));
}
