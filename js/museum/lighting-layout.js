import { BUILDING, HALLS } from './layout.js';
import { CORRIDOR_COFFERS } from './corridor-layout.js';

// Shared by the visible ceiling geometry and the offline floor-lighting bake.
export const CEILING_SCHEMES = [
  'coffers', 'fins', 'coffers', 'rafts', 'rafts',
  'rafts', 'fins', 'coffers', 'rafts', 'fins',
];

export const FLOOR_REGIONS = [
  { id: 'promenade', x: 0, z: -60, width: 10, depth: 140 },
  ...HALLS.map(hall => ({ id: hall.id, ...hall.center, width: 22, depth: 26, hallIndex: hall.index })),
];

// Relative diffuse output, integrated over each emitter's area. These are
// architectural lighting proxies, not a claim of a full global-illumination bake.
export function floorEmitters(region) {
  const sources = [], h = BUILDING.height;
  const add = (x, z, width, depth, power, height = h - .2) =>
    sources.push({ x, z, width, depth, height, power });
  if (region.hallIndex === undefined) {
    for (const fixture of CORRIDOR_COFFERS)
      add(0, fixture.z, fixture.width, fixture.depth, fixture.power, h - .175);
    for (const side of [-1, 1]) add(side * 4.24, -60, .035, 138, 22, h - .359);
  } else {
    const { x, z } = region;
    for (const side of [-1, 1]) {
      add(x, z + side * 11.7, 17.8, .035, 9, h - .69);
      add(x + side * 9.58, z, .035, 23, 6, h - .28);
    }
    const scheme = CEILING_SCHEMES[region.hallIndex];
    if (scheme === 'coffers') {
      for (const dx of [-4.65, 4.65]) for (const dz of [-7.2, 0, 7.2])
        add(x + dx, z + dz, 7.25, 5.45, 11, h - .16);
    } else if (scheme === 'fins') {
      for (const dx of [-7.2, 7.2]) add(x + dx, z, .08, 19.8, 30, h - .3);
    } else {
      for (const dz of [-6, 5.8]) for (const edge of [-1, 1])
        add(x, z + dz + edge * 3.55, 12.7, .035, 16, h - .24);
    }
  }
  return sources;
}
