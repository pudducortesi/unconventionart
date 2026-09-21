import test from 'node:test';
import assert from 'node:assert/strict';
import { createResolutionPolicy } from '../js/museum/resolution-policy.js';

function setup() {
  const pending = new Map();
  let id = 0, wakes = 0;
  const policy = createResolutionPolicy({
    wake: () => wakes++,
    schedule: (fn, delay) => { assert.equal(delay, 1200); pending.set(++id, fn); return id; },
    cancel: id => pending.delete(id),
  });
  return { policy, pending, get wakes() { return wakes; }, settle() {
    const jobs = [...pending.values()]; pending.clear(); jobs.forEach(fn => fn());
  } };
}

test('short pauses between gestures keep motion resolution and cancel idle upgrade', () => {
  const s = setup();
  for (let i = 0; i < 20; i++) {
    assert.equal(s.policy.sample(true, 1.1, 2), 1.1);
    assert.equal(s.pending.size, 0);
    assert.equal(s.policy.sample(false, 1.1, 2), 1.1);
    assert.equal(s.pending.size, 1);
  }
  s.policy.sample(true, 1.1, 2);
  s.settle();
  assert.equal(s.wakes, 0);
});

test('settled scene restores Retina once without a continuous render loop', () => {
  const s = setup();
  for (let i = 0; i < 20; i++) s.policy.sample(false, 1.1, 2);
  assert.equal(s.pending.size, 1);
  s.settle();
  assert.equal(s.wakes, 1);
  assert.equal(s.policy.sample(false, 1.1, 2), 2);
  assert.equal(s.pending.size, 0);
  assert.equal(s.policy.sample(true, 1, 2), 1);
});

test('suspension cancels callbacks and can resume after page restoration', () => {
  const s = setup();
  s.policy.sample(false, 1.1, 2);
  s.policy.suspend(); s.settle();
  assert.equal(s.wakes, 0);
  s.policy.sample(false, 1.1, 2); s.settle();
  assert.equal(s.wakes, 1);
});
