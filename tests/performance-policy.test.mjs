import test from 'node:test';
import assert from 'node:assert/strict';
import { createPerformancePolicy } from '../js/museum/performance-policy.js';

test('sustained slow desktop frames reduce quality in bounded stages', () => {
  const p = createPerformancePolicy();
  for (let i=0;i<40;i++) p.sample(33,true);
  assert.equal(p.profile.ratio,1);
  for (let i=0;i<40;i++) p.sample(33,true);
  assert.equal(p.profile.economical,true);
  for (let i=0;i<200;i++) p.sample(100,true);
  assert.equal(p.profile.ratio,.85);
});
test('smooth movement, isolated stalls and tab pauses do not downgrade', () => {
  const p = createPerformancePolicy();
  for (let i=0;i<300;i++) p.sample(16.7,true);
  p.sample(200,true);
  p.sample(3000,true);
  for (let i=0;i<200;i++) p.sample(100,false);
  assert.equal(p.profile.ratio,1.25);
});
test('very slow frames still trigger adaptation and quality does not oscillate', () => {
  const p = createPerformancePolicy();
  for (let i=0;i<24;i++) p.sample(150,true);
  assert.equal(p.profile.economical,true);
  for (let i=0;i<500;i++) p.sample(16,true);
  assert.equal(p.profile.economical,true);
});
