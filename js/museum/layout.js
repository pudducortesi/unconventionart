// One continuous museum: ten exhibition halls linked by a central promenade.
// Architecture, pathfinding and the plan all use these same dimensions.
export const CAPACITY = 200;
export const BUILDING = {
  minX: -27,
  maxX: 27,
  minZ: -130,
  maxZ: 10,
  height: 6.6,
};
export const BOUNDS = { minX: -26.45, maxX: 26.45, minZ: -129.45, maxZ: 9.45 };
export const INITIAL = { x: -9, y: 1.7, z: -2.5 };
export const INITIAL_TARGET = { x: -19, y: 2.1, z: -21 };
export const HALLS = [];
export const WALLS = [];
export const FURNITURE = [];
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
      title: `Sala ${String(index + 1).padStart(2, "0")}`,
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
    HALLS.push(hall);
    FURNITURE.push(
      rectangle(x, z + 2.5, 4.4, 1.5, { kind: "bench", hallIndex: index }),
    );
    FURNITURE.push(
      rectangle(x + side * 4.3, z - 4.1, 2.5, 1.5, {
        kind: "lounge",
        hallIndex: index,
      }),
    );
  }
}
FURNITURE.push(rectangle(17.5, 5, 4.4, 1.6, { kind: "reception" }));
FURNITURE.push(rectangle(-16, 5, 4.4, 1.5, { kind: "bench" }));
// Furnished islands keep the central promenade and artwork viewing bands clear.
FURNITURE.push(rectangle(-22, 5, 1.6, 1.6, { kind: "ottoman" }));
FURNITURE.push(rectangle(-11.5, 5, 1.6, 1.6, { kind: "ottoman" }));
FURNITURE.push(rectangle(-8, 5, 1.3, 0.7, { kind: "directory" }));
FURNITURE.push(rectangle(9, 5, 3.4, 1.8, { kind: "editorial" }));
for (const index of [0, 5]) {
  const { x, z } = HALLS[index].center;
  FURNITURE.push(rectangle(x, z - 2, 5.8, 0.5, { kind: "screen", hallIndex: index }));
}
for (const index of [1, 3, 7, 9]) {
  const { x, z } = HALLS[index].center;
  FURNITURE.push(rectangle(x - 3, z - 4, 2.8, 1.4, { kind: "editorial", hallIndex: index }));
}
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
