import * as T from '../../vendor/three.module.js';
import { FLOOR_LIGHTMAPS } from '../../vendor/gallery-lightmaps.js';

export function createFloorLightmaps(own, id) {
  const { width, height, light, occlusion } = FLOOR_LIGHTMAPS[id];
  const texture = (encoded, format, colourSpace) => {
    const channel = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const bytes = format === T.RGBAFormat ? new Uint8Array(width * height * 4) : channel;
    if (format === T.RGBAFormat) for (let i = 0; i < channel.length; i++) {
      bytes[i * 4] = channel[i];
      bytes[i * 4 + 1] = Math.round(channel[i] * .965);
      bytes[i * 4 + 2] = Math.round(channel[i] * .91);
      bytes[i * 4 + 3] = 255;
    }
    const map = own(new T.DataTexture(bytes, width, height, format));
    map.name = `${id}-baked-${format === T.RedFormat ? 'occlusion' : 'light'}`;
    map.channel = 1;
    map.colorSpace = colourSpace;
    map.magFilter = map.minFilter = T.LinearFilter;
    map.needsUpdate = true;
    return map;
  };
  return { lightMap: texture(light, T.RGBAFormat, T.LinearSRGBColorSpace), lightMapIntensity: 1,
    aoMap: texture(occlusion, T.RedFormat, T.NoColorSpace), aoMapIntensity: .75 };
}
