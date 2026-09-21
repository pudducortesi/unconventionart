import test from "node:test";
import assert from "node:assert/strict";
import {
  BOUNDS,
  OBSTACLES,
  moveWithCollision,
  insideObstacle,
  findPath,
  layoutWorks,
  orientation,
  shortestAngle,
  safeViewpoint,
  viewingDistance,
} from "../js/museum/navigation.js";
import {
  INITIAL,
  HALLS,
  FURNITURE,
  CAPACITY,
  locateHall,
} from "../js/museum/layout.js";

function assertWalkable(point) {
  assert(point && Number.isFinite(point.x) && Number.isFinite(point.z));
  assert(point.x >= BOUNDS.minX - 1e-9 && point.x <= BOUNDS.maxX + 1e-9);
  assert(point.z >= BOUNDS.minZ - 1e-9 && point.z <= BOUNDS.maxZ + 1e-9);
  assert(
    !insideObstacle(point.x, point.z),
    `A visitor intersects an obstacle at ${point.x}, ${point.z}`,
  );
}
function assertSafeRoute(start, route, goal) {
  assert(route.length > 0, `No route to ${JSON.stringify(goal)}`);
  assert.deepEqual(route.at(-1), goal);
  let previous = start;
  for (const point of route) {
    const steps = Math.ceil(
      Math.hypot(point.x - previous.x, point.z - previous.z) / 0.055,
    );
    for (let index = 0; index <= steps; index++) {
      const t = steps ? index / steps : 0;
      assertWalkable({
        x: previous.x + (point.x - previous.x) * t,
        z: previous.z + (point.z - previous.z) * t,
      });
    }
    previous = point;
  }
}
const works = Array.from({ length: CAPACITY }, (_, id) => ({
  id: `work-${id}`,
  collection: `collection-${Math.floor(id / 30)}`,
}));
const slots = layoutWorks(works);

test("the continuous museum has 200 unique hanging positions in ten halls", () => {
  assert.equal(HALLS.length, 10);
  assert.equal(CAPACITY, 200);
  assert.equal(slots.length, 200);
  assert.equal(new Set(slots.map(({ x, z }) => `${x},${z}`)).size, 200);
  assert.equal(layoutWorks([...works, { id: "overflow" }]).length, 200);
  assert.equal(layoutWorks([]).length, 0);
  assert.equal(
    layoutWorks([works[0]])[0].x,
    slots[0].x,
    "Adding works must not relocate previously hung photos",
  );
  for (const hall of HALLS)
    assert.equal(
      slots.filter(({ hallIndex }) => hallIndex === hall.index).length,
      20,
    );
  slots.forEach((slot, index) =>
    assert.equal(slot.work, works[index], "Preserve real collection metadata"),
  );
});

test("the entrance and every hall connect through a walkable doorway", () => {
  assertWalkable(INITIAL);
  const started = performance.now();
  for (const hall of HALLS) {
    const route = findPath(INITIAL, hall.entry);
    assertSafeRoute(INITIAL, route, hall.entry);
    assert.equal(locateHall(hall.entry), hall.index);
    assert(
      route.length <= 5,
      "A long promenade should not produce a grid zigzag",
    );
    assertSafeRoute(
      hall.entry,
      findPath(hall.entry, { x: INITIAL.x, z: INITIAL.z }),
      { x: INITIAL.x, z: INITIAL.z },
    );
  }
  assert(
    performance.now() - started < 3000,
    "Twenty full-building routes must complete without an interactive hang",
  );
});

test("all 200 artworks have a reachable view inside their own exhibition hall", () => {
  for (const slot of slots) {
    const point = safeViewpoint({
      x: slot.x + Math.sin(slot.rotation) * 4.8,
      z: slot.z + Math.cos(slot.rotation) * 4.8,
    });
    assert.equal(
      locateHall(point),
      slot.hallIndex,
      `Wrong hall for ${slot.work.id}`,
    );
    assertSafeRoute(INITIAL, findPath(INITIAL, point), point);
  }
});

test("full-length routes between opposite halls cannot cut through a partition", () => {
  for (const [from, to] of [
    [0, 9],
    [9, 0],
    [2, 7],
    [7, 2],
  ]) {
    const start = HALLS[from].entry,
      goal = HALLS[to].entry;
    assertSafeRoute(start, findPath(start, goal), goal);
  }
});

test("touch movement blocks solid walls but passes through all ten doors", () => {
  for (const hall of HALLS) {
    const side = hall.side;
    const blocked = moveWithCollision(
      { x: 0, z: hall.center.z + 6 },
      side * 18,
      0,
    );
    assert(Math.abs(blocked.x - side * 4.56) < 1e-9);
    assertWalkable(blocked);
    const doorway = moveWithCollision(
      { x: 0, z: hall.center.z },
      side * 8.5,
      0,
    );
    assert.deepEqual(doorway, hall.entry);
    const sliding = moveWithCollision(blocked, side * 0.2, -0.2);
    assert.equal(sliding.x, blocked.x);
    assert(
      sliding.z < blocked.z,
      "A blocked diagonal input must slide along the wall",
    );
  }
});

test("long inputs cannot tunnel through furniture or leave the building", () => {
  for (const furniture of FURNITURE) {
    const start = { x: furniture.x, z: furniture.minZ - 0.31 };
    assertWalkable(start);
    const end = moveWithCollision(start, 0, furniture.depth + 3);
    assert(Math.abs(end.z - (furniture.minZ - 0.28)) < 1e-8);
    assertWalkable(end);
  }
  const promenadeStart = { x: 0, z: 6 };
  assert.equal(moveWithCollision(promenadeStart, 0, 1000).z, BOUNDS.maxZ);
  assert.equal(moveWithCollision(promenadeStart, 0, -1000).z, BOUNDS.minZ);
  assert.equal(moveWithCollision({ x: -25, z: -20 }, -1000, 0).x, BOUNDS.minX);
  assert.equal(moveWithCollision({ x: 25, z: -20 }, 1000, 0).x, BOUNDS.maxX);
});

test("furniture click destinations are rejected and obstructed viewpoints are corrected", () => {
  for (const furniture of FURNITURE) {
    const center = { x: furniture.x, z: furniture.z };
    assert.deepEqual(findPath(INITIAL, center), []);
    const corrected = safeViewpoint(center);
    assertWalkable(corrected);
    assert(Math.hypot(center.x - corrected.x, center.z - corrected.z) < 1.2);
  }
  assert.deepEqual(findPath(INITIAL, { x: NaN, z: 0 }), []);
  assert.deepEqual(findPath({ x: NaN, z: 0 }, INITIAL), []);
});

test("routes keep their exact endpoints beside walls and at both sides of seating islands", () => {
  for (const hall of HALLS) {
    const bench = FURNITURE.find(
      (f) => f.hallIndex === hall.index && f.kind === "lounge",
    );
    const start = { x: bench.x, z: bench.minZ - 0.31 };
    const goal = { x: bench.x + 0.127, z: bench.maxZ + 0.31 };
    assertSafeRoute(start, findPath(start, goal), goal);
  }
  const goal = { x: 0.137, z: -128.251 };
  assert.deepEqual(
    findPath({ x: 0, z: 6 }, goal),
    [goal],
    "An unobstructed promenade uses a direct segment",
  );
});

test("camera framing remains in each hall for portrait phones and wide photographs", () => {
  for (const aspect of [320 / 844, 390 / 844, 844 / 390, 1440 / 900]) {
    for (const [width, height] of [
      [2.4, 3.6],
      [4, 2.25],
    ]) {
      const distance = viewingDistance(width, height, aspect);
      const tangent = Math.tan((53 * Math.PI) / 360);
      assert((width + 1.65) / (2 * distance * tangent * aspect) <= 0.86 + 1e-9);
      assert((height + 0.5) / (2 * distance * tangent) <= 0.62 + 1e-9);
      for (const slot of slots) {
        const bounds = HALLS[slot.hallIndex].bounds;
        const point = safeViewpoint({
          x: Math.max(
            bounds.minX + 0.6,
            Math.min(
              bounds.maxX - 0.6,
              slot.x +
                Math.cos(slot.rotation) * 0.35 +
                Math.sin(slot.rotation) * distance,
            ),
          ),
          z: Math.max(
            bounds.minZ + 0.6,
            Math.min(
              bounds.maxZ - 0.6,
              slot.z -
                Math.sin(slot.rotation) * 0.35 +
                Math.cos(slot.rotation) * distance,
            ),
          ),
        });
        assertWalkable(point);
        assert.equal(locateHall(point), slot.hallIndex);
      }
    }
  }
});

test("camera orientation takes the shortest rotation across +/- pi", () => {
  assert(
    Math.abs(orientation({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: -1 }).yaw) <
      1e-8,
  );
  assert(Math.abs(shortestAngle(Math.PI - 0.1, -Math.PI + 0.1) - 0.2) < 1e-8);
  assert(
    OBSTACLES.length > 40,
    "The tested plan includes all partitions and furnishings",
  );
});
