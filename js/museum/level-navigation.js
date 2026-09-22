import { BOUNDS, OBSTACLES, findPath, insideObstacle, moveWithCollision, safeViewpoint } from './navigation.js';
import { MEZZANINES, MEZZANINE_HEIGHT, stairFloorHeight } from './mezzanine-layout.js';

const RADIUS = 0.28, EPSILON = 1e-6, STEP = 0.08;
const HEADROOM = 2.1;
const contains = (r, p, margin = 0) => p.x >= r.minX - margin - EPSILON &&
  p.x <= r.maxX + margin + EPSILON && p.z >= r.minZ - margin - EPSILON &&
  p.z <= r.maxZ + margin + EPSILON;
const finite = p => p && Number.isFinite(p.x) && Number.isFinite(p.z) &&
  Number.isFinite(p.floorY ?? 0);
const point = (p, floorY = 0) => ({ x: p.x, z: p.z, floorY });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const stairWidth = (s, p) => p.x >= s.minX + RADIUS - EPSILON && p.x <= s.maxX - RADIUS + EPSILON;
const lowStairs = MEZZANINES.map(({ stair: s }) => ({
  minX: s.minX, maxX: s.maxX,
  minZ: s.maxZ - (HEADROOM + 0.18) / s.height * s.depth,
  maxZ: s.maxZ,
}));
const lowBlocked = p => lowStairs.some(r => contains(r, p, RADIUS - EPSILON));
const groundSafe = p => contains(BOUNDS, p) && !insideObstacle(p.x, p.z) && !lowBlocked(p);
const atEntrance = p => MEZZANINES.some(({ stair: s }) => stairWidth(s, p) &&
  p.z >= s.maxZ - EPSILON && p.z <= s.maxZ + RADIUS + EPSILON);

function deckSafe(m, p) {
  if (!m.deck.some(r => contains(r, p))) return false;
  // Test the complete visitor footprint, not merely its centre. The small
  // stair mouth connects the landing to the first tread without a false gap.
  const mouth = { ...m.stair, maxZ: m.stair.minZ + RADIUS };
  for (const dx of [-RADIUS, 0, RADIUS]) for (const dz of [-RADIUS, 0, RADIUS]) {
    const q = { x: p.x + dx, z: p.z + dz };
    if (!m.deck.some(r => contains(r, q)) && !contains(mouth, q)) return false;
  }
  return true;
}

function stateAt(p) {
  if (!finite(p)) return null;
  const y = p.floorY ?? 0;
  if (y < -0.015 || y > MEZZANINE_HEIGHT + 0.015) return null;
  for (const m of MEZZANINES) {
    const s = m.stair;
    if (Math.abs(y - m.height) < 0.015 && deckSafe(m, p)) return { kind: 'deck', m };
    if (contains(s, p) && stairWidth(s, p) && Math.abs(y - stairFloorHeight(s, p.z)) < s.height / s.steps + 0.015)
      return { kind: 'stair', m };
  }
  return Math.abs(y) < 0.015 && (groundSafe(p) || atEntrance(p)) ? { kind: 'ground' } : null;
}

export function isLevelWalkable(position) {
  return !!stateAt(position);
}

export function safeLevelViewpoint(desired) {
  if (!finite(desired)) return null;
  if ((desired.floorY ?? 0) > 0.015) return isLevelWalkable(desired) ? point(desired, desired.floorY) : null;
  const original = safeViewpoint(desired);
  if (!original) return null;
  if (groundSafe(original)) return point(original);
  let nearest = null, best = Infinity;
  for (const r of lowStairs) {
    if (!contains(r, original, RADIUS)) continue;
    const margin = RADIUS + 0.035;
    for (const candidate of [
      { x: r.minX - margin, z: original.z }, { x: r.maxX + margin, z: original.z },
      { x: original.x, z: r.minZ - margin }, { x: original.x, z: r.maxZ + margin },
    ]) {
      const d = distance(original, candidate);
      if (d <= 1.5 && d < best && groundSafe(candidate)) { nearest = point(candidate); best = d; }
    }
  }
  return nearest;
}

function advance(p, amount, axis) {
  const state = stateAt(p);
  if (!state) return p;
  const q = { ...p, [axis]: p[axis] + amount };
  if (state.kind === 'ground') {
    const moved = moveWithCollision(p, axis === 'x' ? amount : 0, axis === 'z' ? amount : 0);
    q.x = moved.x; q.z = moved.z;
    if (axis === 'z' && amount < 0) {
      for (const m of MEZZANINES) {
        const s = m.stair;
        // Only the bottom entrance can change the visitor's level. Walking
        // underneath a high tread must never snap the visitor onto the stair.
        if (stairWidth(s, q) && p.z >= s.maxZ - EPSILON && q.z <= s.maxZ)
          return { ...q, floorY: stairFloorHeight(s, q.z) };
      }
    }
    // The approach at the foot is deliberately open; the solid lower stair
    // still blocks the flanks and the low-headroom space underneath it.
    return !lowBlocked(q) || atEntrance(q) ? q : p;
  }
  const { m } = state, s = m.stair;
  if (state.kind === 'stair') {
    if (!stairWidth(s, q)) return p;
    if (q.z < s.minZ) return deckSafe(m, q) ? { ...q, floorY: m.height } : p;
    if (q.z > s.maxZ) {
      if (insideObstacle(q.x, q.z)) return p;
      return { ...q, floorY: 0 };
    }
    return { ...q, floorY: stairFloorHeight(s, q.z) };
  }
  if (axis === 'z' && amount > 0 && stairWidth(s, q) &&
      p.z <= s.minZ + EPSILON && q.z > s.minZ && q.z <= s.maxZ)
    return { ...q, floorY: stairFloorHeight(s, q.z) };
  return deckSafe(m, q) ? q : p;
}

export function moveOnLevels(position, dx, dz) {
  let current = point(position, position.floorY ?? 0);
  if (!finite(current)) return current;
  const initial = stateAt(current);
  if (!initial) return current;
  current.floorY = initial.kind === 'stair' ? stairFloorHeight(initial.m.stair, current.z) :
    initial.kind === 'deck' ? initial.m.height : 0;
  dx = Number.isFinite(dx) ? dx : 0;
  dz = Number.isFinite(dz) ? dz : 0;
  // Substeps prevent tunnelling across stair rails or an open atrium even
  // after a delayed frame. Per-axis resolution retains natural wall sliding.
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / STEP));
  for (let i = 0; i < steps; i++) {
    if (dx) current = advance(current, dx / steps, 'x');
    if (dz) current = advance(current, dz / steps, 'z');
  }
  return current;
}

function intersects(a, b, box, padding) {
  let enter = 0, leave = 1;
  for (const axis of ['x', 'z']) {
    const suffix = axis.toUpperCase();
    const lo = box[`min${suffix}`] - padding, hi = box[`max${suffix}`] + padding;
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < EPSILON) {
      if (a[axis] <= lo || a[axis] >= hi) return false;
    } else {
      const t1 = (lo - a[axis]) / delta, t2 = (hi - a[axis]) / delta;
      enter = Math.max(enter, Math.min(t1, t2));
      leave = Math.min(leave, Math.max(t1, t2));
    }
  }
  return enter < leave - EPSILON;
}
const groundSegment = (a, b) => groundSafe(a) && groundSafe(b) &&
  !OBSTACLES.some(r => intersects(a, b, r, RADIUS)) &&
  !lowStairs.some(r => intersects(a, b, r, RADIUS + 0.015));
function deckSegment(m, a, b) {
  const steps = Math.max(1, Math.ceil(distance(a, b) / 0.1));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!deckSafe(m, { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })) return false;
  }
  return true;
}

function deckPath(m, start, end) {
  if (deckSegment(m, start, end)) return [point(end, m.height)];
  const nodes = [start, end];
  for (const r of m.deck) for (const x of [r.minX + RADIUS + 0.03, r.maxX - RADIUS - 0.03])
    for (const z of [r.minZ + RADIUS + 0.03, r.maxZ - RADIUS - 0.03])
      if (deckSafe(m, { x, z })) nodes.push({ x, z });
  const costs = nodes.map(() => Infinity), parents = nodes.map(() => -1), done = new Set();
  costs[0] = 0;
  for (;;) {
    let at = -1;
    for (let i = 0; i < nodes.length; i++) if (!done.has(i) && (at < 0 || costs[i] < costs[at])) at = i;
    if (at < 0 || !Number.isFinite(costs[at])) return [];
    if (at === 1) break;
    done.add(at);
    for (let i = 0; i < nodes.length; i++) {
      const nextCost = costs[at] + distance(nodes[at], nodes[i]);
      if (!done.has(i) && nextCost < costs[i] && deckSegment(m, nodes[at], nodes[i])) {
        costs[i] = nextCost; parents[i] = at;
      }
    }
  }
  const path = [];
  for (let at = 1; at > 0; at = parents[at]) path.push(point(nodes[at], m.height));
  return path.reverse();
}

// Most ground routes remain the existing, cached museum navigation. Only a
// route intercepted by a new staircase needs the extra visibility graph.
function groundPath(start, end) {
  // A user may click while already inside the small, open stair approach.
  // Step out along its axis before asking the ground planner to detour.
  if (!groundSafe(start) && atEntrance(start)) {
    const m = MEZZANINES.find(({ stair: s }) => stairWidth(s, start) &&
      start.z >= s.maxZ && start.z <= s.maxZ + RADIUS + EPSILON);
    const outside = approach(m), path = groundPath(outside, end);
    return path.length ? [outside, ...path] : [];
  }
  if (!groundSafe(end) && atEntrance(end)) {
    const m = MEZZANINES.find(({ stair: s }) => stairWidth(s, end) &&
      end.z >= s.maxZ && end.z <= s.maxZ + RADIUS + EPSILON);
    const path = groundPath(start, approach(m));
    return path.length ? [...path, point(end)] : [];
  }
  if (!groundSafe(start) || !groundSafe(end)) return [];
  const basic = findPath(start, end);
  if (!basic.length) return [];
  let previous = start;
  const blocked = new Set();
  for (const p of basic) {
    for (const r of lowStairs) if (intersects(previous, p, r, RADIUS + 0.015)) blocked.add(r);
    previous = p;
  }
  if (!blocked.size) return basic.map(p => point(p));
  const local = detourGround(start, end, [...blocked]);
  return local.length ? local : detourGround(start, end, lowStairs);
}

function detourGround(start, end, stairs) {
  const nodes = [start, end];
  // Corners of the new obstacles connect using existing collision-safe
  // routes, so furniture and hall walls stay authoritative without a second
  // full-building navmesh. Normally only the intercepted stair is involved;
  // a global fallback handles a detour intercepted by a second staircase.
  for (const r of stairs) for (const x of [r.minX - RADIUS - 0.04, r.maxX + RADIUS + 0.04])
    for (const z of [r.minZ - RADIUS - 0.04, r.maxZ + RADIUS + 0.04])
      if (groundSafe({ x, z })) nodes.push({ x, z });
  const costs = nodes.map(() => Infinity), parents = nodes.map(() => null), done = new Set();
  costs[0] = 0;
  for (;;) {
    let at = -1, best = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const score = costs[i] + distance(nodes[i], end);
      if (!done.has(i) && score < best) { best = score; at = i; }
    }
    if (at < 0) return [];
    if (at === 1) break;
    done.add(at);
    const candidates = nodes.map((p, i) => ({ i, d: distance(nodes[at], p) }))
      .filter(({ i }) => i !== at && !done.has(i))
      .sort((a, b) => a.d - b.d);
    for (const { i } of candidates) {
      if (costs[at] + distance(nodes[at], nodes[i]) >= costs[i]) continue;
      const route = groundSegment(nodes[at], nodes[i]) ? [nodes[i]] : findPath(nodes[at], nodes[i]);
      if (!route.length) continue;
      let anchor = nodes[at], length = 0, clear = true;
      for (const p of route) {
        if (lowStairs.some(r => intersects(anchor, p, r, RADIUS + 0.015))) { clear = false; break; }
        length += distance(anchor, p); anchor = p;
      }
      if (clear && costs[at] + length < costs[i]) {
        costs[i] = costs[at] + length; parents[i] = { at, route };
      }
    }
  }
  const pieces = [];
  for (let at = 1; at > 0; at = parents[at].at) pieces.push(parents[at].route);
  return pieces.reverse().flat().map(p => point(p));
}

const approach = m => ({ x: m.stair.x, z: m.stair.maxZ + RADIUS + 0.06, floorY: 0 });
export function findLevelPath(start, destination) {
  const from = stateAt(start), to = stateAt(destination);
  if (!from || !to) return [];
  const normalize = (p, state) => point(p, state.kind === 'stair' ? stairFloorHeight(state.m.stair, p.z) :
    state.kind === 'deck' ? state.m.height : 0);
  const startPoint = normalize(start, from), goal = normalize(destination, to);
  if (from.kind === 'ground' && to.kind === 'ground') return groundPath(startPoint, goal);
  if (from.m && from.m === to.m) {
    const m = from.m, top = point(m.stair.top, m.height);
    if (from.kind === 'stair' && to.kind === 'stair') return [goal];
    if (from.kind === 'deck' && to.kind === 'deck') return deckPath(m, startPoint, goal);
    if (from.kind === 'stair') {
      const path = deckPath(m, top, goal);
      return path.length ? [top, ...path] : [];
    }
    const path = deckPath(m, startPoint, top);
    return path.length ? [...path, goal] : [];
  }
  const result = [];
  let groundStart = startPoint;
  if (from.m) {
    const m = from.m;
    if (from.kind === 'deck') {
      const path = deckPath(m, startPoint, point(m.stair.top, m.height));
      if (!path.length) return [];
      result.push(...path);
    }
    result.push(point(m.stair.bottom), approach(m));
    groundStart = approach(m);
  }
  const groundGoal = to.m ? approach(to.m) : goal;
  const ground = groundPath(groundStart, groundGoal);
  if (!ground.length) return [];
  result.push(...ground);
  if (to.m) {
    const m = to.m;
    result.push(point(m.stair.bottom));
    if (to.kind === 'stair') result.push(goal);
    else {
      const top = point(m.stair.top, m.height), path = deckPath(m, top, goal);
      if (!path.length) return [];
      result.push(top, ...path);
    }
  }
  return result;
}
