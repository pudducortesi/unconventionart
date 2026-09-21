import test from "node:test";
import assert from "node:assert/strict";
import {
  BOUNDS,
  moveWithCollision,
  insideObstacle,
  findPath,
  layoutWorks,
  orientation,
  shortestAngle,
  safeViewpoint,
  viewingDistance,
} from "../js/museum/navigation.js";
const INITIAL = { x: -1.8, z: 6.7 };
function assertSafeRoute(start, route, goal) {
  assert(route.length > 0, `A route must reach ${JSON.stringify(goal)}`);
  assert.deepEqual(route.at(-1), goal);
  let previous = start;
  for (const point of route) {
    const steps = Math.ceil(
      Math.hypot(point.x - previous.x, point.z - previous.z) / 0.01,
    );
    for (let index = 0; index <= steps; index++) {
      const t = steps ? index / steps : 0;
      const x = previous.x + (point.x - previous.x) * t;
      const z = previous.z + (point.z - previous.z) * t;
      assert(x >= BOUNDS.minX - 1e-9 && x <= BOUNDS.maxX + 1e-9);
      assert(z >= BOUNDS.minZ - 1e-9 && z <= BOUNDS.maxZ + 1e-9);
      assert(!insideObstacle(x, z), `Route intersects furniture at ${x}, ${z}`);
    }
    previous = point;
  }
}
test("the visitor cannot walk through room boundaries", () => {
  const position = moveWithCollision({ x: 0, z: -2 }, 100, -100);
  assert(Math.abs(position.x - BOUNDS.maxX) < 1e-9);
  assert(Math.abs(position.z - BOUNDS.minZ) < 1e-9);
});
test("a continuous walk stops at the bench and can slide alongside it", () => {
  let position = { x: 1.5, z: -2 };
  for (let i = 0; i < 100; i++) position = moveWithCollision(position, 0, 0.05);
  assert(!insideObstacle(position.x, position.z));
  assert(position.z < -0.5);
  const sliding = moveWithCollision(position, 0.1, 0.1);
  assert(sliding.x > position.x);
  assert(!insideObstacle(sliding.x, sliding.z));
});
test("click-to-walk finds a route around furniture, never across it", () => {
  const start = { x: 1.5, z: -2 },
    end = { x: 1.5, z: 2 };
  const route = findPath(start, end);
  assertSafeRoute(start, route, end);
  assert(
    route.length <= 3,
    "A single bench requires at most two turning points",
  );
});
test("clicks on furniture do not start a walk", () => {
  assert.deepEqual(findPath({ x: 0, z: -2 }, { x: 1.5, z: 0.3 }), []);
});
test("all eight hanging positions have accessible viewing points", () => {
  const works = Array.from({ length: 8 }, (_, i) => ({ id: i }));
  const slots = layoutWorks(works);
  assert.equal(slots.length, 8);
  for (const slot of slots) {
    const point = safeViewpoint({
      x: slot.x + Math.sin(slot.rotation) * 4.8,
      z: slot.z + Math.cos(slot.rotation) * 4.8,
    });
    assert(!insideObstacle(point.x, point.z));
    assertSafeRoute(INITIAL, findPath(INITIAL, point), point);
  }
  assert.equal(layoutWorks([{ id: "one" }])[0].x, 0);
});
test("camera faces artworks and takes the short rotation across +/- pi", () => {
  assert(
    Math.abs(orientation({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: -1 }).yaw) <
      1e-8,
  );
  assert(Math.abs(shortestAngle(Math.PI - 0.1, -Math.PI + 0.1) - 0.2) < 1e-8);
});

test("portrait phone framing computes space for photograph and wall label", () => {
  for (const [w, h] of [
    [320, 568],
    [390, 844],
    [430, 932],
    [844, 390],
    [1440, 900],
  ]) {
    const aspect = w / h,
      distance = viewingDistance(2.4, 3.6, aspect),
      tangent = Math.tan((53 * Math.PI) / 360);
    assert((2.4 + 1.65) / (2 * distance * tangent * aspect) <= 0.86 + 1e-9);
    assert((3.6 + 0.5) / (2 * distance * tangent) <= 0.62 + 1e-9);
  }
});

test("a long input cannot tunnel through any of the three furnishings", () => {
  for (const [start, distance, limit] of [
    [{ x: 1.5, z: -2 }, 4, -0.58],
    [{ x: -4.5, z: 2 }, 4, 3.27],
    [{ x: 4.5, z: 4 }, 4, 5.195],
  ]) {
    const end = moveWithCollision(start, 0, distance);
    assert(end.z <= limit + 1e-9, "Walk must stop on the near side");
    assert(!insideObstacle(end.x, end.z));
  }
});

test("exact endpoints beside furniture keep safe start and finish connectors", () => {
  const routes = [
    [
      { x: 1.5, z: -0.6 },
      { x: 0.15, z: -0.1 },
    ],
    [
      { x: -4.5, z: 3.25 },
      { x: -4.5, z: 5.15 },
    ],
    [
      { x: 4.5, z: 5.18 },
      { x: 4.5, z: 7.03 },
    ],
    [INITIAL, { x: 6.245, z: 6.1 }],
  ];
  for (const [start, goal] of routes)
    assertSafeRoute(start, findPath(start, goal), goal);
});

test("unobstructed click travel uses a direct path rather than a grid zigzag", () => {
  const goal = { x: 0.137, z: -7.251 };
  assert.deepEqual(findPath(INITIAL, goal), [goal]);
});

test("viewpoints on furniture project to a nearby safe location", () => {
  for (const desired of [
    { x: 1.6, z: 0.3 },
    { x: -4.7, z: 4.2 },
    { x: 4.65, z: 6.1 },
  ]) {
    const point = safeViewpoint(desired);
    assert(!insideObstacle(point.x, point.z));
    assert(Math.hypot(point.x - desired.x, point.z - desired.z) < 1);
    assertSafeRoute(INITIAL, findPath(INITIAL, point), point);
  }
});

test("portrait phones and landscape photos never place a viewpoint outside the room", () => {
  const slots = layoutWorks(Array.from({ length: 8 }, (_, id) => ({ id })));
  for (const aspect of [320 / 844, 390 / 844, 844 / 390, 1440 / 900]) {
    for (const [width, height] of [
      [2.4, 3.6],
      [4, 2.25],
    ]) {
      const distance = viewingDistance(width, height, aspect);
      for (const slot of slots) {
        const point = safeViewpoint({
          x:
            slot.x +
            Math.cos(slot.rotation) * 0.35 +
            Math.sin(slot.rotation) * distance,
          z:
            slot.z -
            Math.sin(slot.rotation) * 0.35 +
            Math.cos(slot.rotation) * distance,
        });
        assertSafeRoute(INITIAL, findPath(INITIAL, point), point);
      }
    }
  }
});
