import { ROOM_PROFILES } from "./room-profiles.js";
import { CORRIDOR_BENCHES } from './corridor-layout.js';
// One continuous museum: ten exhibition halls linked by a central promenade.
// Architecture, pathfinding and the plan all use these same dimensions.
export const CAPACITY = 200;
export const PHOTO_SHARE = 0.6;
export const HANGING_CENTER = 1.8;
export const PHOTO_FORMATS = [
  { width: 1.6, height: 2.4, label: '160 × 240 cm' },
  { width: 2.4, height: 1.6, label: '240 × 160 cm' },
  { width: 1.2, height: 1.8, label: '120 × 180 cm' },
];
export const BUILDING = {
  minX: -27,
  maxX: 27,
  minZ: -130,
  maxZ: 10,
  height: 13.2,
};
export const BOUNDS = { minX: -26.45, maxX: 26.45, minZ: -129.45, maxZ: 9.45 };
export const INITIAL = { x: -19, y: 1.7, z: -10.9 };
export const INITIAL_TARGET = { x: -26.7, y: HANGING_CENTER, z: -10.9 };
export const HALLS = [];
export const WALLS = [];
export const FURNITURE = [];
export const RUGS = [];
const rectangle = (x, z, width, depth, extra = {}) => ({
  minX: x - width / 2,
  maxX: x + width / 2,
  minZ: z - depth / 2,
  maxZ: z + depth / 2,
  x,
  z,
  width,
  depth,
  ...extra,
});
const wall = (x, z, width, depth) =>
  WALLS.push(rectangle(x, z, width, depth, { kind: "wall" }));
wall(-27, -60, 0.32, 140);
wall(27, -60, 0.32, 140);
wall(0, 10, 54, 0.32);
wall(0, -130, 54, 0.32);
for (let row = 0; row < 5; row++) {
  const z = -13 - row * 26;
  for (const side of [-1, 1]) {
    const index = row * 2 + (side === 1 ? 1 : 0);
    const x = side * 16;
    const minX = side === -1 ? -27 : 5;
    const maxX = side === -1 ? -5 : 27;
    const hall = {
      id: `hall-${index + 1}`,
      index,
      title: `Sala ${String(index + 1).padStart(2, "0")} · ${ROOM_PROFILES[index].name}`,
      profile: ROOM_PROFILES[index],
      side,
      center: { x, z },
      bounds: { minX, maxX, minZ: z - 13, maxZ: z + 13 },
      entry: { x: side * 8.5, z },
      slots: [],
    };
    // The inner wall is deliberately interrupted by a five-metre doorway.
    wall(side * 5, z + 7.75, 0.32, 10.5);
    wall(side * 5, z - 7.75, 0.32, 10.5);
    if (row === 0) wall(x, 0, 22, 0.32);
    if (row < 4) wall(x, z - 13, 22, 0.32);
    const slot = (sx, sz, rotation) =>
      hall.slots.push({ x: sx, z: sz, rotation, hallIndex: index });
    // Five works per cross-wall; spacing includes each physical wall label.
    for (let column = 0; column < 5; column++) {
      const sx = minX + 2.6 + column * 4.2;
      slot(sx, z - 12.7, 0);
    }
    for (let column = 0; column < 6; column++)
      slot(
        side * 26.7,
        z - 10.5 + column * 4.2,
        side === -1 ? Math.PI / 2 : -Math.PI / 2,
      );
    for (let column = 0; column < 5; column++) {
      const sx = minX + 2.6 + column * 4.2;
      slot(sx, z + 12.7, Math.PI);
    }
    for (const dz of [-9.6, -5.3, 5.3, 9.6])
      slot(side * 5.3, z + dz, side === -1 ? -Math.PI / 2 : Math.PI / 2);
    // Start with the outer wall visible from the doorway, then follow the perimeter.
    const order = [8, 9, 10, 11, 12, 13, 14, 15, 19, 18, 17, 16, 4, 3, 2, 1, 0, 5, 6, 7];
    hall.slots = order.map((previous, position) => ({
      ...hall.slots[previous],
      formatIndex: position % PHOTO_FORMATS.length,
      format: PHOTO_FORMATS[position % PHOTO_FORMATS.length],
      plannedPhoto: Array.from({ length: 12 }, (_, n) => Math.floor(n * 20 / 12)).includes(position),
      id: `S${index + 1}-${String(position + 1).padStart(2, '0')}`,
    }));
    HALLS.push(hall);
  }
}
// Composed seating islands: screen rooms face the film; other rooms pair chairs.
const models = ['discs', 'bibendum', 'geometric', 'ribbed', 'cantilever', 'tufted', 'sling', 'geometric', 'bibendum', 'tufted'];
for (const hall of HALLS) {
  const { x } = hall.center;
  const index = hall.index;
  // Arrival has a clear sightline; its lounge sits beside the visitor's route.
  const z = hall.center.z - (index === 0 ? 6 : 0);
  const cinema = index === 3 || index === 5;
  const seat = (sx, sz, model, rotation = 0) => FURNITURE.push(
    rectangle(sx, sz, model === 'discs' ? 2.5 : 1.6, 1.6,
      { kind: 'lounge', model, rotation, hallIndex: index }));
  if (cinema) {
    FURNITURE.push(rectangle(x, z - 2, 5.8, 0.5, { kind: 'screen', hallIndex: index }));
    seat(x - 1.8, z + 2.7, models[index]);
    seat(x + 1.8, z + 2.7, index === 0 ? 'sling' : 'cantilever');
  } else {
    seat(x - 2.1, z + 1.8, models[index]);
    seat(x + 2.1, z - 1.8, index === 0 ? 'sling' : models[index], Math.PI);
    FURNITURE.push(rectangle(x, z, 1.4, 1.4, { kind: 'coffee', hallIndex: index }));
  }
  FURNITURE.push(rectangle(x + 3.7, z + 2.8, 0.65, 0.65, { kind: 'lamp', hallIndex: index }));
}
FURNITURE.push(rectangle(17.5, 5, 4.4, 1.6, { kind: 'reception' }));
FURNITURE.push(rectangle(-17.5, 5.8, 2.5, 1.5, { kind: 'lounge', model: 'daybed' }));
FURNITURE.push(rectangle(-13.5, 5.8, 1.6, 1.6, { kind: 'lounge', model: 'bibendum' }));
FURNITURE.push(rectangle(-15.5, 3.6, 1.4, 1.4, { kind: 'coffee' }));
FURNITURE.push(rectangle(-20, 5.8, 1.2, 1.8, { kind: 'lounge', model: 'nesting' }));
FURNITURE.push(rectangle(-12, 6.7, 0.65, 0.65, { kind: 'lamp' }));
FURNITURE.push(rectangle(-8, 5, 1.3, 0.7, { kind: 'directory' }));
FURNITURE.push(rectangle(9, 5, 3.4, 1.8, { kind: 'editorial' }));
FURNITURE.push(rectangle(16, -121, 2.5, 1.5, { kind: 'lounge', model: 'daybed', hallIndex: 9 }));
for (const index of [1, 3, 7, 9]) {
  const { x, z } = HALLS[index].center;
  FURNITURE.push(rectangle(x - 3, z - 4.5, 2.8, 1.4, { kind: 'editorial', hallIndex: index }));
}
// Complete living compositions inside the protected exhibition perimeter.
for (const hall of HALLS) {
  const { x, z } = hall.center;
  const hallIndex = hall.index;
  const add = (dx, dz, width, depth, kind, extra = {}) => FURNITURE.push(
    rectangle(x + dx, z + dz, width, depth, { kind, hallIndex, ...extra }));
  const cinema = [3, 5].includes(hallIndex);
  const reading = [1, 7].includes(hallIndex);
  RUGS.push(rectangle(x, z - (hallIndex === 0 ? 6 : 0), 7.6, hallIndex === 0 ? 5.3 : 4.8, { hallIndex, shape: hall.profile.shape }));
  RUGS.push(rectangle(x, z + 5.2, 8.2, 5.6, { hallIndex, shape: hall.profile.shape }));
  if (reading) {
    add(0, 5, 3.6, 1.3, 'reading');
    for (const dx of [-0.9, 0.9]) {
      add(dx, 7.0, 1.2, 1.2, 'lounge', { model: 'cantilever' });
      add(dx, 3.1, 1.2, 1.2, 'lounge', { model: 'cantilever', rotation: Math.PI });
    }
  } else {
    add(0, 6.3, 3.4, 1.3, 'lounge', { model: hall.profile.seat });
    if (!cinema) {
      add(0, 4.3, 1.36, 0.48, 'lowtable');
      if ([0, 2, 6, 8].includes(hallIndex)) {
        const model = { 0: 'sling', 2: 'geometric', 6: 'cantilever', 8: 'bibendum' }[hallIndex];
        add(-3.1, 5.2, 1.6, 1.6, 'lounge', { model, rotation: -Math.PI / 2 });
        add(3.1, 5.2, 1.6, 1.6, 'lounge', { model, rotation: Math.PI / 2 });
      } else {
        add(-3.1, 5.2, 1.1, 1.1, 'ottoman');
        add(3.1, 5.2, 1.1, 1.1, 'ottoman');
      }
    } else {
      add(0, 0.1, 1.36, 0.48, 'lowtable');
    }
  }
  add(4.7, -5.2, 2.4, 0.65, 'console');
  add(-3.2, 7.4, 0.65, 0.65, 'lamp');
}
FURNITURE.push(rectangle(23, 5, 2.4, 0.7, { kind: 'consultation' }));
for (const x of [22.3, 23.7]) FURNITURE.push(rectangle(x, 3.7, 0.5, 0.5, { kind: 'temu' }));
RUGS.push(rectangle(-16, 5.2, 10, 5.8));
FURNITURE.push(rectangle(16.5, 8.4, 5.2, 0.65, { kind: 'console' }));
FURNITURE.push(rectangle(17.5, 7, 1.2, 1.2, { kind: 'lounge', model: 'cantilever' }));
for (const bench of CORRIDOR_BENCHES)
  FURNITURE.push(rectangle(bench.x, bench.z, bench.width, bench.depth, bench));
// Reserved exhibition envelopes: 3.8m along the wall, 4m clear in front.
// These are planning constraints, not barriers for visitors.
export const EXHIBITION_ZONES = HALLS.flatMap(hall => hall.slots.map(slot => {
  const nx = Math.sin(slot.rotation), nz = Math.cos(slot.rotation);
  return rectangle(slot.x + nx * 2, slot.z + nz * 2,
    Math.abs(nx) > 0.5 ? 4 : 3.8, Math.abs(nx) > 0.5 ? 3.8 : 4,
    { slotId: slot.id, hallIndex: hall.index });
}));
export const OBSTACLES = [...WALLS, ...FURNITURE];
export function locateHall(position) {
  const hall = HALLS.find(
    ({ bounds }) =>
      position.x > bounds.minX + 0.16 &&
      position.x < bounds.maxX - 0.16 &&
      position.z > bounds.minZ + 0.16 &&
      position.z < bounds.maxZ - 0.16,
  );
  return hall ? hall.index : -1;
}
