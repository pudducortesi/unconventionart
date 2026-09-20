// Pure navigation math; shared by the room controller and collision tests.
export const BOUNDS = { minX: -6.25, maxX: 6.25, minZ: -8.05, maxZ: 8.05 };
export const OBSTACLES = [{ minX: 2.5, maxX: 4.8, minZ: 1.2, maxZ: 2.4 }];
export function insideObstacle(x, z, padding = 0.28) {
  return OBSTACLES.some(
    (b) =>
      x > b.minX - padding &&
      x < b.maxX + padding &&
      z > b.minZ - padding &&
      z < b.maxZ + padding,
  );
}
export function moveWithCollision(position, dx, dz) {
  const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
  const x = clamp(position.x + dx, BOUNDS.minX, BOUNDS.maxX);
  const z = clamp(position.z + dz, BOUNDS.minZ, BOUNDS.maxZ);
  const result = { x: position.x, z: position.z };
  if (!insideObstacle(x, result.z)) result.x = x;
  if (!insideObstacle(result.x, z)) result.z = z;
  return result;
}
export function shortestAngle(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}
export function orientation(from, to) {
  const dx = to.x - from.x,
    dz = to.z - from.z;
  return {
    yaw: Math.atan2(-dx, -dz),
    pitch: Math.atan2(to.y - from.y, Math.hypot(dx, dz)),
  };
}
export function layoutWorks(works) {
  const positions =
    works.length === 1
      ? [{ x: 0, z: -8.69, rotation: 0 }]
      : [
          { x: -3.5, z: -8.69, rotation: 0 },
          { x: 3.5, z: -8.69, rotation: 0 },
          { x: -6.69, z: -4.3, rotation: Math.PI / 2 },
          { x: 6.69, z: -4.3, rotation: -Math.PI / 2 },
          { x: -6.69, z: 1, rotation: Math.PI / 2 },
          { x: 6.69, z: 1, rotation: -Math.PI / 2 },
          { x: -3.5, z: 8.69, rotation: Math.PI },
          { x: 3.5, z: 8.69, rotation: Math.PI },
        ];
  return works
    .slice(0, 8)
    .map((work, index) => ({ ...positions[index], work }));
}
// A small navigation grid routes clicks around the bench rather than through it.
export function findPath(start, destination) {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const goal = {
    x: clamp(destination.x, BOUNDS.minX + 0.1, BOUNDS.maxX - 0.1),
    z: clamp(destination.z, BOUNDS.minZ + 0.1, BOUNDS.maxZ - 0.1),
  };
  if (insideObstacle(goal.x, goal.z)) return [];
  const size = 0.5,
    key = (x, z) => `${x},${z}`;
  const source = {
    x: Math.round(start.x / size),
    z: Math.round(start.z / size),
  };
  const target = { x: Math.round(goal.x / size), z: Math.round(goal.z / size) };
  const valid = (x, z) =>
    x * size >= BOUNDS.minX &&
    x * size <= BOUNDS.maxX &&
    z * size >= BOUNDS.minZ &&
    z * size <= BOUNDS.maxZ &&
    !insideObstacle(x * size, z * size, 0.38);
  if (!valid(target.x, target.z)) {
    let closest = null;
    for (let x = target.x - 2; x <= target.x + 2; x++)
      for (let z = target.z - 2; z <= target.z + 2; z++)
        if (valid(x, z)) {
          const distance = Math.hypot(x * size - goal.x, z * size - goal.z);
          if (!closest || distance < closest.distance)
            closest = { x, z, distance };
        }
    if (!closest) return [];
    target.x = closest.x;
    target.z = closest.z;
  }
  const queue = [source],
    seen = new Set([key(source.x, source.z)]),
    parents = new Map();
  let found = false;
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    if (node.x === target.x && node.z === target.z) {
      found = true;
      break;
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = node.x + dx,
        z = node.z + dz,
        k = key(x, z);
      if (!valid(x, z) || seen.has(k)) continue;
      seen.add(k);
      parents.set(k, node);
      queue.push({ x, z });
    }
  }
  if (!found) return [];
  const path = [];
  let node = target;
  while (node.x !== source.x || node.z !== source.z) {
    path.unshift({ x: node.x * size, z: node.z * size });
    node = parents.get(key(node.x, node.z));
    if (!node) return [];
  }
  // Keep the conservative grid endpoint if the exact point falls next to furniture.
  if (!insideObstacle(goal.x, goal.z, 0.4)) path.push(goal);
  return path;
}
