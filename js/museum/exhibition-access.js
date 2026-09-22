import { HALLS } from './layout.js';

// Published photographs and programmed video both open their room.
export function exhibitionAccess(slots, videos = []) {
  const open = new Set([...slots, ...videos].map(item => item.hallIndex));
  const closed = HALLS.filter(hall => !open.has(hall.index));
  const doors = closed.map(hall => ({
    hallIndex: hall.index, x: hall.side * 5, z: hall.center.z,
    minX: hall.side * 5 - .16, maxX: hall.side * 5 + .16,
    minZ: hall.center.z - 2.5, maxZ: hall.center.z + 2.5,
  }));
  return { open, closed, doors };
}
