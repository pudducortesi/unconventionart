import { portraitSetSlot } from './portrait-set.js';
import { BOUNDS, OBSTACLES, HALLS, CAPACITY, INITIAL } from "./layout.js";

// The same plan drives rendering and navigation; all coordinates are in metres.
export { BOUNDS, OBSTACLES };
const CLEARANCE = 0.28;
const ROUTE_MARGIN = 0.015;
const BUCKET_SIZE = 4;
const GRID_STEP = 0.75;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const inBounds = ({ x, z }) =>
  Number.isFinite(x) &&
  Number.isFinite(z) &&
  x >= BOUNDS.minX &&
  x <= BOUNDS.maxX &&
  z >= BOUNDS.minZ &&
  z <= BOUNDS.maxZ;

// Spatial buckets prevent every touch frame from inspecting the entire museum.
const buckets = new Map();
for (const box of OBSTACLES) {
  for (
    let x = Math.floor((box.minX - CLEARANCE) / BUCKET_SIZE);
    x <= Math.floor((box.maxX + CLEARANCE) / BUCKET_SIZE);
    x++
  ) {
    for (
      let z = Math.floor((box.minZ - CLEARANCE) / BUCKET_SIZE);
      z <= Math.floor((box.maxZ + CLEARANCE) / BUCKET_SIZE);
      z++
    ) {
      const key = `${x},${z}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(box);
    }
  }
}
function nearbyBoxes(point) {
  return (
    buckets.get(
      `${Math.floor(point.x / BUCKET_SIZE)},${Math.floor(point.z / BUCKET_SIZE)}`,
    ) || []
  );
}
function segmentBoxes(start, end) {
  const boxes = new Set();
  for (
    let x = Math.floor(Math.min(start.x, end.x) / BUCKET_SIZE);
    x <= Math.floor(Math.max(start.x, end.x) / BUCKET_SIZE);
    x++
  ) {
    for (
      let z = Math.floor(Math.min(start.z, end.z) / BUCKET_SIZE);
      z <= Math.floor(Math.max(start.z, end.z) / BUCKET_SIZE);
      z++
    ) {
      for (const box of buckets.get(`${x},${z}`) || []) boxes.add(box);
    }
  }
  return boxes;
}
export function insideObstacle(x, z, padding = CLEARANCE) {
  const candidates = padding <= CLEARANCE ? nearbyBoxes({ x, z }) : OBSTACLES;
  return candidates.some(
    (box) =>
      x > box.minX - padding &&
      x < box.maxX + padding &&
      z > box.minZ - padding &&
      z < box.maxZ + padding,
  );
}

// Project an obstructed viewpoint to a nearby free position. The usual case
// (already walkable) is constant time, including during continuous movement.
export function safeViewpoint(desired) {
  if (!desired || !Number.isFinite(desired.x) || !Number.isFinite(desired.z))
    return null;
  const origin = {
    x: clamp(desired.x, BOUNDS.minX, BOUNDS.maxX),
    z: clamp(desired.z, BOUNDS.minZ, BOUNDS.maxZ),
  };
  if (!insideObstacle(origin.x, origin.z)) return origin;
  let nearest = null,
    distance = Infinity;
  const consider = (x, z) => {
    const candidate = {
      x: clamp(x, BOUNDS.minX, BOUNDS.maxX),
      z: clamp(z, BOUNDS.minZ, BOUNDS.maxZ),
    };
    const nextDistance = Math.hypot(
      candidate.x - desired.x,
      candidate.z - desired.z,
    );
    if (nextDistance < distance && !insideObstacle(candidate.x, candidate.z)) {
      nearest = candidate;
      distance = nextDistance;
    }
  };
  for (const box of OBSTACLES) {
    const left = box.minX - CLEARANCE - ROUTE_MARGIN,
      right = box.maxX + CLEARANCE + ROUTE_MARGIN;
    const top = box.minZ - CLEARANCE - ROUTE_MARGIN,
      bottom = box.maxZ + CLEARANCE + ROUTE_MARGIN;
    consider(left, origin.z);
    consider(right, origin.z);
    consider(origin.x, top);
    consider(origin.x, bottom);
    consider(left, top);
    consider(left, bottom);
    consider(right, top);
    consider(right, bottom);
  }
  return nearest;
}

function sweepAxis(start, amount, axis) {
  const other = axis === "x" ? "z" : "x";
  const suffix = axis.toUpperCase(),
    crossSuffix = other.toUpperCase();
  let target = clamp(
    start[axis] + amount,
    BOUNDS[`min${suffix}`],
    BOUNDS[`max${suffix}`],
  );
  const end = { ...start, [axis]: target };
  for (const box of segmentBoxes(start, end)) {
    if (
      start[other] <= box[`min${crossSuffix}`] - CLEARANCE ||
      start[other] >= box[`max${crossSuffix}`] + CLEARANCE
    )
      continue;
    const low = box[`min${suffix}`] - CLEARANCE,
      high = box[`max${suffix}`] + CLEARANCE;
    if (amount > 0 && start[axis] <= low && target > low) target = low;
    if (amount < 0 && start[axis] >= high && target < high) target = high;
  }
  return target;
}
export function moveWithCollision(position, dx, dz) {
  const result = safeViewpoint(position) || { x: INITIAL.x, z: INITIAL.z };
  // Swept collisions stop even a very long wheel/frame input at the near face.
  // Resolving axes separately allows natural sliding along walls and furniture.
  if (Number.isFinite(dx) && dx) result.x = sweepAxis(result, dx, "x");
  if (Number.isFinite(dz) && dz) result.z = sweepAxis(result, dz, "z");
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
  const composed = works.some(work => portraitSetSlot(work.id));
  const slots = HALLS.filter(hall => !composed || hall.index !== 0).flatMap((hall) => hall.slots);
  const used = new Set();
  return works.slice(0, CAPACITY).map(work => {
    const curated = portraitSetSlot(work.id);
    if (curated) return {...curated, work};
    const assigned = (!composed || work.hallIndex !== 0) && Number.isInteger(work.hallIndex) && Number.isInteger(work.wallSlot)
      ? HALLS[work.hallIndex]?.slots[work.wallSlot] : null;
    if (assigned && used.has(assigned.id)) throw Error('Due opere occupano la stessa posizione.');
    const slot = assigned || slots.find(item => !used.has(item.id));
    used.add(slot.id);
    return {...slot,work};
  });
}

// Exact rectangle intersection includes the visitor's radius. This is also
// used for path shortcuts, so compression never cuts a wall or furniture.
function clearSegment(start, end) {
  if (
    !inBounds(start) ||
    !inBounds(end) ||
    insideObstacle(start.x, start.z) ||
    insideObstacle(end.x, end.z)
  )
    return false;
  for (const box of segmentBoxes(start, end)) {
    let enter = -Infinity,
      leave = Infinity;
    let intersects = true;
    for (const axis of ["x", "z"]) {
      const suffix = axis.toUpperCase();
      const low = box[`min${suffix}`] - CLEARANCE,
        high = box[`max${suffix}`] + CLEARANCE;
      const delta = end[axis] - start[axis];
      if (Math.abs(delta) < 1e-12) {
        if (start[axis] <= low || start[axis] >= high) {
          intersects = false;
          break;
        }
      } else {
        const a = (low - start[axis]) / delta,
          b = (high - start[axis]) / delta;
        enter = Math.max(enter, Math.min(a, b));
        leave = Math.min(leave, Math.max(a, b));
      }
    }
    if (intersects && Math.max(enter, 0) < Math.min(leave, 1)) return false;
  }
  return true;
}

class MinHeap {
  items = [];
  push(item) {
    let index = this.items.length;
    this.items.push(item);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.items[parent].score <= item.score) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = item;
  }
  pop() {
    const first = this.items[0],
      last = this.items.pop();
    if (this.items.length) {
      let index = 0;
      while (index * 2 + 1 < this.items.length) {
        let child = index * 2 + 1;
        if (
          child + 1 < this.items.length &&
          this.items[child + 1].score < this.items[child].score
        )
          child++;
        if (this.items[child].score >= last.score) break;
        this.items[index] = this.items[child];
        index = child;
      }
      this.items[index] = last;
    }
    return first;
  }
  get length() {
    return this.items.length;
  }
}
const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
let grid;
function getGrid() {
  if (grid) return grid;
  const columns = Math.floor((BOUNDS.maxX - BOUNDS.minX) / GRID_STEP) + 1;
  const rows = Math.floor((BOUNDS.maxZ - BOUNDS.minZ) / GRID_STEP) + 1;
  const size = columns * rows;
  const walkable = new Uint8Array(size),
    edgeMask = new Uint8Array(size),
    edgeReady = new Uint8Array(size);
  const point = (id) => ({
    x: BOUNDS.minX + (id % columns) * GRID_STEP,
    z: BOUNDS.minZ + Math.floor(id / columns) * GRID_STEP,
  });
  for (let id = 0; id < size; id++) {
    const p = point(id);
    walkable[id] = insideObstacle(p.x, p.z) ? 0 : 1;
  }
  grid = { columns, rows, size, walkable, edgeMask, edgeReady, point };
  return grid;
}
function connectors(point, mesh) {
  const column = Math.round((point.x - BOUNDS.minX) / GRID_STEP);
  const row = Math.round((point.z - BOUNDS.minZ) / GRID_STEP);
  const choices = [];
  // Connections use the actual click position, not a snapped point on the far
  // side of a wall. The first ring normally provides several valid choices.
  for (let radius = 1; radius <= 6; radius++) {
    for (let dz = -radius; dz <= radius; dz++)
      for (let dx = -radius; dx <= radius; dx++) {
        if (radius > 1 && Math.max(Math.abs(dx), Math.abs(dz)) !== radius)
          continue;
        const x = column + dx,
          z = row + dz;
        if (x < 0 || z < 0 || x >= mesh.columns || z >= mesh.rows) continue;
        const id = z * mesh.columns + x;
        if (!mesh.walkable[id]) continue;
        const target = mesh.point(id);
        if (clearSegment(point, target))
          choices.push({
            id,
            distance: Math.hypot(target.x - point.x, target.z - point.z),
          });
      }
    if (choices.length >= 4) break;
  }
  choices.sort((a, b) => a.distance - b.distance);
  return choices.slice(0, 8);
}
function edges(id, mesh) {
  if (mesh.edgeReady[id]) return mesh.edgeMask[id];
  const column = id % mesh.columns,
    row = Math.floor(id / mesh.columns),
    start = mesh.point(id);
  let mask = 0;
  for (let direction = 0; direction < DIRECTIONS.length; direction++) {
    const [dx, dz] = DIRECTIONS[direction],
      x = column + dx,
      z = row + dz;
    if (x < 0 || z < 0 || x >= mesh.columns || z >= mesh.rows) continue;
    const next = z * mesh.columns + x;
    if (mesh.walkable[next] && clearSegment(start, mesh.point(next)))
      mask |= 1 << direction;
  }
  mesh.edgeReady[id] = 1;
  mesh.edgeMask[id] = mask;
  return mask;
}
function compressPath(start, points) {
  const result = [];
  let anchor = start,
    next = 0;
  while (next < points.length) {
    let farthest = next;
    // Search from the endpoint so long clear corridor segments become one walk.
    for (let candidate = points.length - 1; candidate > next; candidate--) {
      if (clearSegment(anchor, points[candidate])) {
        farthest = candidate;
        break;
      }
    }
    result.push(points[farthest]);
    anchor = points[farthest];
    next = farthest + 1;
  }
  return result;
}
export function findPath(start, destination) {
  if (
    !start ||
    !destination ||
    !Number.isFinite(destination.x) ||
    !Number.isFinite(destination.z)
  )
    return [];
  const goal = {
    x: clamp(destination.x, BOUNDS.minX, BOUNDS.maxX),
    z: clamp(destination.z, BOUNDS.minZ, BOUNDS.maxZ),
  };
  if (
    !inBounds(start) ||
    insideObstacle(start.x, start.z) ||
    insideObstacle(goal.x, goal.z)
  )
    return [];
  if (clearSegment(start, goal)) return [goal];
  const mesh = getGrid(),
    starts = connectors(start, mesh),
    goals = connectors(goal, mesh);
  if (!starts.length || !goals.length) return [];
  const goalConnections = new Map(
    goals.map(({ id, distance }) => [id, distance]),
  );
  const distance = new Float64Array(mesh.size).fill(Infinity);
  const parent = new Int32Array(mesh.size).fill(-1),
    visited = new Uint8Array(mesh.size);
  const queue = new MinHeap();
  const heuristic = (id) => {
    const p = mesh.point(id);
    return Math.hypot(p.x - goal.x, p.z - goal.z);
  };
  for (const entry of starts) {
    distance[entry.id] = entry.distance;
    parent[entry.id] = -2;
    queue.push({ id: entry.id, score: entry.distance + heuristic(entry.id) });
  }
  let finalNode = -1,
    total = Infinity;
  while (queue.length) {
    const entry = queue.pop(),
      id = entry.id;
    if (entry.score >= total) break;
    if (visited[id]) continue;
    visited[id] = 1;
    if (goalConnections.has(id)) {
      const cost = distance[id] + goalConnections.get(id);
      if (cost < total) {
        total = cost;
        finalNode = id;
      }
    }
    const mask = edges(id, mesh);
    for (let direction = 0; direction < DIRECTIONS.length; direction++) {
      if (!(mask & (1 << direction))) continue;
      const [dx, dz] = DIRECTIONS[direction],
        next = id + dz * mesh.columns + dx;
      if (visited[next]) continue;
      const cost = distance[id] + GRID_STEP * (dx && dz ? Math.SQRT2 : 1);
      if (cost < distance[next]) {
        distance[next] = cost;
        parent[next] = id;
        queue.push({ id: next, score: cost + heuristic(next) });
      }
    }
  }
  if (finalNode < 0) return [];
  const path = [goal];
  for (let id = finalNode; id >= 0; id = parent[id]) path.push(mesh.point(id));
  path.reverse();
  return compressPath(start, path);
}

// Keep the complete photograph and wall label in phone and desktop viewports.
export function viewingDistance(width, height, aspect, fov = 53) {
  const tangent = Math.tan((fov * Math.PI) / 360);
  return Math.max(
    4.2,
    (height + 0.5) / (2 * tangent * 0.62),
    (width + 1.65) / (2 * tangent * Math.max(0.3, aspect) * 0.86),
  );
}
