// Pure navigation math; shared by the room controller and collision tests.
export const BOUNDS = { minX: -6.25, maxX: 6.25, minZ: -8.05, maxZ: 8.05 };
export const OBSTACLES = [
  { minX: 0.45, maxX: 2.75, minZ: -0.3, maxZ: 0.9 }, // bench
  { minX: -6, maxX: -3.4, minZ: 3.55, maxZ: 4.85 }, // left seat
  { minX: 3.35, maxX: 5.95, minZ: 5.475, maxZ: 6.725 }, // reception
];
const CLEARANCE = 0.28;
const ROUTE_MARGIN = 0.01;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const inBounds = ({ x, z }) =>
  Number.isFinite(x) &&
  Number.isFinite(z) &&
  x >= BOUNDS.minX &&
  x <= BOUNDS.maxX &&
  z >= BOUNDS.minZ &&
  z <= BOUNDS.maxZ;
export function insideObstacle(x, z, padding = CLEARANCE) {
  return OBSTACLES.some(
    (b) =>
      x > b.minX - padding &&
      x < b.maxX + padding &&
      z > b.minZ - padding &&
      z < b.maxZ + padding,
  );
}
// The nearest valid camera position, retaining a small margin from furniture.
// The caller owns camera height: navigation positions contain only x and z.
export function safeViewpoint(desired) {
  const origin = {
    x: clamp(desired.x, BOUNDS.minX, BOUNDS.maxX),
    z: clamp(desired.z, BOUNDS.minZ, BOUNDS.maxZ),
  };
  if (!insideObstacle(origin.x, origin.z)) return origin;
  const xs = [origin.x, BOUNDS.minX, BOUNDS.maxX];
  const zs = [origin.z, BOUNDS.minZ, BOUNDS.maxZ];
  for (const obstacle of OBSTACLES) {
    xs.push(
      obstacle.minX - CLEARANCE - ROUTE_MARGIN,
      obstacle.maxX + CLEARANCE + ROUTE_MARGIN,
    );
    zs.push(
      obstacle.minZ - CLEARANCE - ROUTE_MARGIN,
      obstacle.maxZ + CLEARANCE + ROUTE_MARGIN,
    );
  }
  let nearest = null;
  let distance = Infinity;
  for (const x of xs)
    for (const z of zs) {
      const point = { x, z };
      if (!inBounds(point) || insideObstacle(x, z)) continue;
      const candidateDistance = Math.hypot(x - desired.x, z - desired.z);
      if (candidateDistance < distance) {
        nearest = point;
        distance = candidateDistance;
      }
    }
  return nearest;
}
export function moveWithCollision(position, dx, dz) {
  const result = safeViewpoint(position);
  const offsetX = clamp(result.x + dx, BOUNDS.minX, BOUNDS.maxX) - result.x;
  const offsetZ = clamp(result.z + dz, BOUNDS.minZ, BOUNDS.maxZ) - result.z;
  // Bound the sweep even for wheel input or a large elapsed frame. Checking
  // only the final coordinate allowed a single long step through furniture.
  const steps = Math.max(
    1,
    Math.ceil(Math.max(Math.abs(offsetX), Math.abs(offsetZ)) / 0.08),
  );
  for (let step = 0; step < steps; step++) {
    const x = clamp(result.x + offsetX / steps, BOUNDS.minX, BOUNDS.maxX);
    const z = clamp(result.z + offsetZ / steps, BOUNDS.minZ, BOUNDS.maxZ);
    if (!insideObstacle(x, result.z)) result.x = x;
    if (!insideObstacle(result.x, z)) result.z = z;
  }
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
// Continuous segment/rectangle intersection, including the visitor's radius.
// Endpoints alone are insufficient: a clear endpoint may be behind a bench.
function clearSegment(start, end) {
  if (
    !inBounds(start) ||
    !inBounds(end) ||
    insideObstacle(start.x, start.z) ||
    insideObstacle(end.x, end.z)
  )
    return false;
  return !OBSTACLES.some((obstacle) => {
    let enter = -Infinity;
    let leave = Infinity;
    for (const axis of ["x", "z"]) {
      const suffix = axis.toUpperCase();
      const low = obstacle[`min${suffix}`] - CLEARANCE;
      const high = obstacle[`max${suffix}`] + CLEARANCE;
      const delta = end[axis] - start[axis];
      if (Math.abs(delta) < 1e-12) {
        // Movement along an outer face does not cross its open interior.
        if (start[axis] <= low || start[axis] >= high) return false;
        continue;
      }
      const a = (low - start[axis]) / delta;
      const b = (high - start[axis]) / delta;
      enter = Math.max(enter, Math.min(a, b));
      leave = Math.min(leave, Math.max(a, b));
    }
    return Math.max(enter, 0) < Math.min(leave, 1);
  });
}
// A visibility graph around furniture corners gives a smooth route with exact,
// collision-checked start/end connections rather than a visible grid zigzag.
export function findPath(start, destination) {
  const goal = {
    x: clamp(destination.x, BOUNDS.minX, BOUNDS.maxX),
    z: clamp(destination.z, BOUNDS.minZ, BOUNDS.maxZ),
  };
  if (
    !inBounds(start) ||
    !inBounds(goal) ||
    insideObstacle(start.x, start.z) ||
    insideObstacle(goal.x, goal.z)
  )
    return [];
  if (clearSegment(start, goal)) return [goal];
  const nodes = [{ x: start.x, z: start.z }, goal];
  for (const obstacle of OBSTACLES) {
    for (const x of [
      obstacle.minX - CLEARANCE - ROUTE_MARGIN,
      obstacle.maxX + CLEARANCE + ROUTE_MARGIN,
    ]) {
      for (const z of [
        obstacle.minZ - CLEARANCE - ROUTE_MARGIN,
        obstacle.maxZ + CLEARANCE + ROUTE_MARGIN,
      ]) {
        const point = {
          x: clamp(x, BOUNDS.minX, BOUNDS.maxX),
          z: clamp(z, BOUNDS.minZ, BOUNDS.maxZ),
        };
        if (!insideObstacle(point.x, point.z)) nodes.push(point);
      }
    }
  }
  const distances = nodes.map(() => Infinity);
  const parents = nodes.map(() => -1);
  const visited = new Set();
  distances[0] = 0;
  while (visited.size < nodes.length) {
    let next = -1;
    for (let index = 0; index < nodes.length; index++) {
      if (
        !visited.has(index) &&
        Number.isFinite(distances[index]) &&
        (next < 0 || distances[index] < distances[next])
      )
        next = index;
    }
    if (next < 0) return [];
    if (next === 1) break;
    visited.add(next);
    for (let index = 0; index < nodes.length; index++) {
      if (visited.has(index) || !clearSegment(nodes[next], nodes[index]))
        continue;
      const distance =
        distances[next] +
        Math.hypot(
          nodes[index].x - nodes[next].x,
          nodes[index].z - nodes[next].z,
        );
      if (distance < distances[index]) {
        distances[index] = distance;
        parents[index] = next;
      }
    }
  }
  const path = [];
  for (let index = 1; index !== 0; index = parents[index]) {
    if (index < 0) return [];
    path.unshift(nodes[index]);
  }
  return path;
}

// Frame the entire photograph and its wall label in portrait and landscape viewports.
export function viewingDistance(width, height, aspect, fov = 53) {
  const tangent = Math.tan((fov * Math.PI) / 360);
  return Math.max(
    4.2,
    (height + 0.5) / (2 * tangent * 0.62),
    (width + 1.65) / (2 * tangent * Math.max(0.3, aspect) * 0.86),
  );
}
