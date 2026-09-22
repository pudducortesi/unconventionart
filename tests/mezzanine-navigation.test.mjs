import test from 'node:test';
import assert from 'node:assert/strict';
import { HALLS, INITIAL, locateHall } from '../js/museum/layout.js';
import { insideObstacle, findPath, viewingDistance } from '../js/museum/navigation.js';
import { MEZZANINES, MEZZANINE_HEIGHT, stairFloorHeight } from '../js/museum/mezzanine-layout.js';
import { findLevelPath, isLevelWalkable, moveOnLevels, safeLevelViewpoint } from '../js/museum/level-navigation.js';

const close = (a, b, message) => assert(Math.abs(a - b) < 1e-5, message ?? `${a} != ${b}`);
const landing = m => ({ x: m.stair.x, z: m.stair.minZ - 0.65, floorY: m.height });
const foot = m => ({ x: m.stair.x, z: m.stair.maxZ + 0.34, floorY: 0 });
function follow(start, route, goal, frameStep = 0.1) {
  assert(route.length, `No route: ${JSON.stringify(start)} -> ${JSON.stringify(goal)}`);
  let p = { ...start, floorY: start.floorY ?? 0 };
  for (const target of route) {
    let remaining = Math.hypot(target.x - p.x, target.z - p.z), count = 0;
    while (remaining > 1e-5 && count++ < 5000) {
      const scale = Math.min(1, frameStep / remaining);
      const next = moveOnLevels(p, (target.x - p.x) * scale, (target.z - p.z) * scale);
      assert(isLevelWalkable(next), `Unsafe movement: ${JSON.stringify(next)}`);
      assert(Math.hypot(next.x - p.x, next.z - p.z) > 1e-7,
        `Stuck at ${JSON.stringify(p)} heading to ${JSON.stringify(target)}`);
      assert(Math.abs(next.floorY - p.floorY) < frameStep * 0.7 + 0.015, 'Height must progress smoothly, never teleport');
      p = next;
      remaining = Math.hypot(target.x - p.x, target.z - p.z);
    }
    assert(count < 5000, 'A waypoint must be reachable');
    close(p.floorY, target.floorY);
  }
  close(p.x, goal.x); close(p.z, goal.z); close(p.floorY, goal.floorY ?? 0);
  return p;
}

test('all ten rooms have a physical U deck, open centre and connected notched stair landing', () => {
  assert.equal(MEZZANINES.length, 10);
  assert.equal(MEZZANINE_HEIGHT, 6.2);
  for (const m of MEZZANINES) {
    const hall = HALLS[m.hallIndex], s = m.stair;
    assert.equal(s.steps, 36);
    close(s.width, 1.6); close(s.depth, 9.2);
    assert(!m.deck.some(r => hall.center.x > r.minX && hall.center.x < r.maxX &&
      hall.center.z > r.minZ && hall.center.z < r.maxZ));
    assert(!m.deck.some(r => s.x > r.minX && s.x < r.maxX &&
      s.minZ + 0.4 > r.minZ && s.minZ + 0.4 < r.maxZ), 'No deck across the staircase headroom');
    assert(isLevelWalkable(landing(m)));
    assert(isLevelWalkable(foot(m)));
    close(stairFloorHeight(s, s.maxZ), 0);
    close(stairFloorHeight(s, s.minZ), m.height);
  }
});

test('manual movement ascends and descends every stair without falling off its flanks', () => {
  for (const m of MEZZANINES) {
    const s = m.stair;
    let p = foot(m);
    p = moveOnLevels(p, 0, -s.depth - 0.99);
    close(p.floorY, m.height);
    close(p.z, s.minZ - 0.65);
    p = moveOnLevels(p, 0, s.depth + 0.99);
    close(p.floorY, 0); close(p.z, foot(m).z);
    const middle = { x: s.x, z: (s.minZ + s.maxZ) / 2, floorY: m.height / 2 };
    const left = moveOnLevels(middle, -20, 0), right = moveOnLevels(middle, 20, 0);
    assert(left.x >= s.minX + 0.28 - 1e-6);
    assert(right.x <= s.maxX - 0.28 + 1e-6);
    close(left.floorY, middle.floorY); close(right.floorY, middle.floorY);
  }
});

test('each entry has a complete executable click route upstairs and back down', () => {
  const begin = performance.now();
  for (const m of MEZZANINES) {
    const entry = { ...HALLS[m.hallIndex].entry, floorY: 0 }, goal = landing(m);
    follow(entry, findLevelPath(entry, goal), goal);
    follow(goal, findLevelPath(goal, entry), entry);
  }
  assert(performance.now() - begin < 4000, 'Twenty level routes should remain interactive');
});

test('the upper U routes around the atrium, never across it or into another room', () => {
  for (const m of MEZZANINES) {
    const h = HALLS[m.hallIndex];
    const start = landing(m), end = { x: h.side * 7, z: h.center.z + 11.6, floorY: m.height };
    const route = findLevelPath(start, end);
    assert(route.length > 1, 'The central void is not a shortcut');
    follow(start, route, end);
    const blocked = moveOnLevels(end, 0, -50);
    close(blocked.floorY, m.height);
    assert(blocked.z > h.center.z + 10.65);
    const wall = moveOnLevels(end, 0, 50);
    assert(wall.z <= h.center.z + 12.52 + 1e-6);
    assert.deepEqual(findLevelPath(start, { ...h.center, floorY: m.height }), []);
  }
});

test('low stairs block ground passage from the side; the tall end can be crossed underneath', () => {
  for (const m of MEZZANINES) {
    const s = m.stair;
    const low = { x: s.minX - 0.6, z: s.maxZ - 1, floorY: 0 };
    const stop = moveOnLevels(low, 4, 0);
    assert(stop.x <= s.minX - 0.28 + 1e-6);
    close(stop.floorY, 0);
    const upper = { x: s.minX - 0.6, z: s.minZ + 2, floorY: 0 };
    const crossed = moveOnLevels(upper, 2.8, 0);
    close(crossed.x, upper.x + 2.8); close(crossed.floorY, 0);
    const goal = { ...low, x: s.maxX + 0.6 };
    const path = findLevelPath(low, goal);
    assert(path.length > 1, 'Click routes detour around the solid stair foot');
    follow(low, path, goal);
  }
});

test('different upper rooms connect by descending, crossing the ground floor, and climbing', () => {
  const start = landing(MEZZANINES[0]), goal = landing(MEZZANINES[9]);
  const path = findLevelPath(start, goal);
  assert(path.some(p => p.floorY === 0));
  follow(start, path, goal);
  follow(goal, findLevelPath(goal, start), start);
});

test('taps on actual stair tread heights normalize to the continuous walking height', () => {
  for (const m of MEZZANINES) {
    const s = m.stair, index = 15;
    const goal = { x: s.x, z: s.maxZ - (index + 0.4) / s.steps * s.depth,
      floorY: (index + 1) / s.steps * s.height + 0.002 };
    const expected = { ...goal, floorY: stairFloorHeight(s, goal.z) };
    const path = findLevelPath(foot(m), goal);
    follow(foot(m), path, expected);
    follow(expected, findLevelPath(expected, landing(m)), landing(m));
    follow(expected, findLevelPath(expected, foot(m)), foot(m));
  }
});

test('unreachable floor heights and void clicks cannot teleport the visitor', () => {
  const m = MEZZANINES[0], hall = HALLS[0];
  for (const goal of [
    { ...hall.center, floorY: 3 },
    { ...hall.center, floorY: m.height },
    { x: 0, z: -13, floorY: m.height },
    { x: NaN, z: -13, floorY: 0 },
    { x: -21, z: -20, floorY: Infinity },
  ]) assert.deepEqual(findLevelPath(INITIAL, goal), []);
  const illegal = { ...hall.center, floorY: m.height };
  assert.deepEqual(moveOnLevels(illegal, 5, 5), illegal);
});

test('actual raised walkable planes and long render frames traverse all stair connections', () => {
  for (const m of MEZZANINES) {
    const from = { ...HALLS[m.hallIndex].entry, floorY: 0 };
    const actualHit = { ...landing(m), floorY: m.height + 0.002 };
    follow(from, findLevelPath(from, actualHit), landing(m), 0.31);
    follow(landing(m), findLevelPath(landing(m), from), from, 0.31);
    const entry = { x: m.stair.x, z: m.stair.maxZ + 0.1, floorY: 0 };
    follow(entry, findLevelPath(entry, from), from, 0.31);
    follow(from, findLevelPath(from, entry), entry, 0.31);
  }
});

test('unaffected ground routes preserve the existing museum waypoints and wall collision', () => {
  const start = { x: 0, z: 6 }, end = { x: 0.137, z: -128.251 };
  assert.deepEqual(findLevelPath(start, end), findPath(start, end).map(p => ({ ...p, floorY: 0 })));
  follow(start, findLevelPath(start, end), end);
  for (const h of HALLS) {
    const point = { x: 0, z: h.center.z + 6, floorY: 0 };
    const stopped = moveOnLevels(point, h.side * 18, 0);
    assert(!insideObstacle(stopped.x, stopped.z));
    close(stopped.x, h.side * 4.56); close(stopped.floorY, 0);
  }
});

test('all 200 ground-floor artwork viewpoints remain reachable without a stair collision', () => {
  for (const hall of HALLS) for (const slot of hall.slots) {
    const desired = { x: slot.x + Math.sin(slot.rotation) * 4.8,
      z: slot.z + Math.cos(slot.rotation) * 4.8 };
    const target = safeLevelViewpoint(desired);
    assert(target, `No free viewpoint for ${slot.id}`);
    assert.equal(locateHall(target), hall.index, `Viewpoint must stay in its hall: ${slot.id}`);
    close(target.floorY, 0);
    const route = findLevelPath(INITIAL, target);
    assert(route.length, `No accessible ground route for ${slot.id}`);
    // Every route segment is executable, including paths beside stair feet.
    follow(INITIAL, route, target, 0.31);
  }
});

test('real photograph framing stays safe on portrait phones, iPads and desktop screens', () => {
  for (const aspect of [0.5625, 1.45, 16 / 9]) for (const hall of HALLS) for (const slot of hall.slots) {
    const distance = viewingDistance(slot.format.width, slot.format.height, aspect);
    const { bounds } = hall;
    const desired = {
      x: Math.max(bounds.minX + 0.7, Math.min(bounds.maxX - 0.7,
        slot.x + Math.cos(slot.rotation) * 0.35 + Math.sin(slot.rotation) * distance)),
      z: Math.max(bounds.minZ + 0.7, Math.min(bounds.maxZ - 0.7,
        slot.z - Math.sin(slot.rotation) * 0.35 + Math.cos(slot.rotation) * distance)),
    };
    const target = safeLevelViewpoint(desired);
    assert(target && isLevelWalkable(target), `Unsafe framing for ${slot.id} at aspect ${aspect}`);
    assert.equal(locateHall(target), hall.index);
  }
});
