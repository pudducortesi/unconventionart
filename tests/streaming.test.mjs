import test from "node:test";
import assert from "node:assert/strict";
import { createArtStream } from "../js/museum/streaming.js";

const flush = () => new Promise((resolve) => setImmediate(resolve));

function harness(slots, options = {}) {
  const pending = new Map();
  const calls = [];
  const mounted = new Map();
  const removed = [];
  const errors = [];
  let active = 0;
  let peakActive = 0;
  let peakMounted = 0;
  const stream = createArtStream({
    slots,
    load(slot, index) {
      calls.push(index);
      active++;
      peakActive = Math.max(peakActive, active);
      return new Promise((resolve, reject) => {
        pending.set(index, {
          resolve() {
            pending.delete(index);
            active--;
            resolve({ index, slot });
          },
          reject(error = new Error("offline")) {
            pending.delete(index);
            active--;
            reject(error);
          },
        });
      });
    },
    mount(art, index) {
      assert(!mounted.has(index), "One catalogue entry must not mount twice");
      mounted.set(index, art);
      peakMounted = Math.max(peakMounted, mounted.size);
    },
    unmount(art, index) {
      mounted.delete(index);
      removed.push(art);
    },
    onError(error, index) {
      errors.push({ error, index });
    },
    ...options,
  });
  return {
    stream,
    pending,
    calls,
    mounted,
    removed,
    errors,
    get peakActive() {
      return peakActive;
    },
    get peakMounted() {
      return peakMounted;
    },
    async finishAll() {
      for (let pass = 0; pending.size && pass < 500; pass++) {
        for (const request of [...pending.values()]) request.resolve();
        await flush();
      }
      assert.equal(pending.size, 0, "Streaming queue must settle");
    },
  };
}

test("a 200-work exhibition retains only 24 nearby photographs and loads two at once", async () => {
  const slots = Array.from({ length: 200 }, (_, index) => ({
    x: (index % 20) * 3,
    z: Math.floor(index / 20) * 3,
  }));
  const h = harness(slots);
  h.stream.update({ x: 0, z: 0 });
  assert.equal(h.pending.size, 2);
  await h.finishAll();
  assert.equal(h.stream.values().length, 24);
  assert.equal(h.calls.length, 24);
  assert.equal(h.peakActive, 2);
  assert.equal(h.peakMounted, 24);
  const closest = slots
    .map((slot, index) => ({ index, distance: slot.x ** 2 + slot.z ** 2 }))
    .sort((a, b) => a.distance - b.distance || a.index - b.index)
    .slice(0, 24)
    .map(({ index }) => index);
  assert.deepEqual(
    h.stream.values().map(([index]) => index),
    closest,
  );
  h.stream.update({ x: 57, z: 27 });
  await h.finishAll();
  assert.equal(h.stream.values().length, 24);
  assert(h.peakMounted <= 24);
  assert(h.peakActive <= 2);
  assert(h.removed.length > 0);
  h.stream.dispose();
});

test("walking away during a request disposes its result without mounting it", async () => {
  const h = harness(
    [
      { x: 0, z: 0 },
      { x: 2, z: 0 },
      { x: 1000, z: 0 },
      { x: 1002, z: 0 },
    ],
    { limit: 2 },
  );
  h.stream.update({ x: 0, z: 0 });
  h.stream.update({ x: 1000, z: 0 });
  h.pending.get(0).resolve();
  h.pending.get(1).resolve();
  await flush();
  assert.deepEqual(
    h.removed.map((art) => art.index),
    [0, 1],
  );
  assert.equal(h.mounted.size, 0);
  assert.deepEqual([...h.pending.keys()], [2, 3]);
  await h.finishAll();
  assert.deepEqual([...h.mounted.keys()], [2, 3]);
  h.stream.dispose();
});

test("ensure prioritizes a distant work, shares requests, and retains it until update", async () => {
  const h = harness(
    [
      { x: 0, z: 0 },
      { x: 1000, z: 0 },
    ],
    { limit: 1 },
  );
  h.stream.update({ x: 0, z: 0 });
  const first = h.stream.ensure(1);
  assert.equal(first, h.stream.ensure(1));
  assert.deepEqual(h.calls, [0, 1]);
  h.pending.get(0).resolve();
  h.pending.get(1).resolve();
  const art = await first;
  await flush();
  assert.equal(art.index, 1);
  assert.equal(h.stream.get(1), art);
  assert.deepEqual(
    h.removed.map((value) => value.index),
    [0],
  );
  h.stream.update({ x: 0, z: 0 }, { selected: 1 });
  assert.equal(h.stream.get(1), art);
  assert.equal(h.pending.size, 0);
  h.stream.update({ x: 0, z: 0 });
  assert.equal(h.stream.get(1), null);
  await h.finishAll();
  assert.equal(h.stream.get(0).index, 0);
  assert.equal(h.peakMounted, 1);
  h.stream.dispose();
});

test("failed textures back off instead of retrying on every animation frame", async () => {
  let clock = 100;
  const h = harness([{ x: 0, z: 0 }], { now: () => clock });
  const first = h.stream.ensure(0);
  h.pending.get(0).reject();
  assert.equal(await first, null);
  for (let frame = 0; frame < 120; frame++) {
    h.stream.update({ x: 0, z: 0 }, { force: true });
  }
  assert.equal(await h.stream.ensure(0), null);
  assert.equal(h.calls.length, 1);
  assert.equal(h.errors.length, 1);
  clock = 3100;
  h.stream.update({ x: 0, z: 0 });
  assert.equal(h.calls.length, 2);
  h.pending.get(0).reject();
  await flush();
  clock = 6100;
  h.stream.update({ x: 0, z: 0 });
  assert.equal(h.calls.length, 2);
  clock = 9100;
  h.stream.update({ x: 0, z: 0 });
  await h.finishAll();
  assert.equal(h.calls.length, 3);
  assert.equal(h.stream.get(0).index, 0);
  h.stream.dispose();
});

test("dispose settles callers and cleans pending textures without new loads", async () => {
  const h = harness(Array.from({ length: 6 }, (_, x) => ({ x, z: 0 })));
  const requested = h.stream.ensure(0);
  h.stream.update({ x: 0, z: 0 });
  assert.equal(h.pending.size, 2);
  h.stream.dispose();
  h.stream.dispose();
  assert.equal(await requested, null);
  await h.finishAll();
  assert.equal(h.mounted.size, 0);
  assert.equal(h.removed.length, 2);
  assert.equal(h.calls.length, 2);
  assert.deepEqual(h.stream.values(), []);
  h.stream.update({ x: 0, z: 0 });
  assert.equal(await h.stream.ensure(1), null);
});

test("many ensure calls preserve the resident limit and eventually settle", async () => {
  const h = harness(
    Array.from({ length: 20 }, (_, x) => ({ x, z: 0 })),
    { limit: 3 },
  );
  const requested = Array.from({ length: 20 }, (_, index) =>
    h.stream.ensure(index),
  );
  await h.finishAll();
  const results = await Promise.all(requested);
  assert.deepEqual(
    results.map((art) => art.index),
    Array.from({ length: 20 }, (_, index) => index),
  );
  assert.equal(h.calls.length, 20);
  assert(h.peakMounted <= 3);
  assert(h.peakActive <= 2);
  h.stream.dispose();
});
