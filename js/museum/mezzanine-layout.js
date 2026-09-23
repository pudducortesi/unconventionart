import { HALLS } from './layout.js';

export const MEZZANINE_HEIGHT = 6.2;
const rectangle = (minX, maxX, minZ, maxZ) => ({
  minX, maxX, minZ, maxZ,
  x: (minX + maxX) / 2, z: (minZ + maxZ) / 2,
  width: maxX - minX, depth: maxZ - minZ,
});

// One physical plan shared by the ironwork, collision and click-to-walk routes.
// The U opens toward the promenade; its stair opening does not create a hole
// in the landing behind it or in the ground-floor exhibition perimeter.
export const MEZZANINES = HALLS.map(hall => {
  const { x, z } = hall.center;
  const left = hall.bounds.minX + 0.2, right = hall.bounds.maxX - 0.2;
  const stairX = x - 5.5;
  const stair = {
    ...rectangle(stairX - 0.8, stairX + 0.8, z - 11.2, z - 2),
    bottom: { x: stairX, z: z - 2 },
    top: { x: stairX, z: z - 11.2 },
    height: MEZZANINE_HEIGHT, steps: 36,
  };
  return {
    hallIndex: hall.index,
    height: MEZZANINE_HEIGHT,
    deck: [
      rectangle(hall.side < 0 ? left : right - 2.4,
        hall.side < 0 ? left + 2.4 : right, z - 12.8, z + 12.8),
      rectangle(left, right, z + 10.4, z + 12.8),
      rectangle(left, stair.minX, z - 12.8, z - 10.4),
      rectangle(stair.maxX, right, z - 12.8, z - 10.4),
      rectangle(stair.minX, stair.maxX, z - 12.8, stair.minZ),
    ],
    stair,
  };
});

export function stairFloorHeight(stair, z) {
  return Math.max(0, Math.min(stair.height,
    (stair.maxZ - z) / stair.depth * stair.height));
}
