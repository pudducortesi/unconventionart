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
} from "../js/museum/navigation.js";
test("the visitor cannot walk through room boundaries", () => {
  const position = moveWithCollision({ x: 0, z: 0 }, 100, -100);
  assert.equal(position.x, BOUNDS.maxX);
  assert.equal(position.z, BOUNDS.minZ);
});
test("a continuous walk stops at the bench and can slide alongside it", () => {
  let position = { x: 3.5, z: 0 };
  for (let i = 0; i < 100; i++) position = moveWithCollision(position, 0, 0.05);
  assert(!insideObstacle(position.x, position.z));
  assert(position.z < 1);
  const sliding = moveWithCollision(position, 0.1, 0.1);
  assert(sliding.x > position.x);
  assert(!insideObstacle(sliding.x, sliding.z));
});
test("click-to-walk finds a route around furniture, never across it", () => {
  const start = { x: 3.5, z: 0 },
    end = { x: 3.5, z: 4 };
  const route = findPath(start, end);
  assert(route.length > 0);
  assert.deepEqual(route.at(-1), end);
  let previous = start;
  for (const point of route) {
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      assert(
        !insideObstacle(
          previous.x + (point.x - previous.x) * t,
          previous.z + (point.z - previous.z) * t,
        ),
      );
    }
    previous = point;
  }
});
test("clicks on furniture do not start a walk", () => {
  assert.deepEqual(findPath({ x: 0, z: 0 }, { x: 3.5, z: 1.8 }), []);
});
test("all eight hanging positions have accessible viewing points", () => {
  const works = Array.from({ length: 8 }, (_, i) => ({ id: i }));
  const slots = layoutWorks(works);
  assert.equal(slots.length, 8);
  for (const slot of slots) {
    const point = {
      x: slot.x + Math.sin(slot.rotation) * 4.8,
      z: slot.z + Math.cos(slot.rotation) * 4.8,
    };
    assert(!insideObstacle(point.x, point.z));
    assert(findPath({ x: -2.8, z: 5.8 }, point).length > 0);
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

test("portrait phone framing fits both photograph and wall label", async () => {
  const { viewingDistance } = await import("../js/museum/navigation.js");
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
    assert(distance < 16, "viewpoint remains inside the room");
  }
});
