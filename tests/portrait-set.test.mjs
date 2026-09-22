import test from 'node:test';
import assert from 'node:assert/strict';
import { PORTRAIT_SET_IDS, portraitSetSlot } from '../js/museum/portrait-set.js';
import { layoutWorks } from '../js/museum/navigation.js';
import { isLevelWalkable, findLevelPath, safeLevelViewpoint } from '../js/museum/level-navigation.js';
import { INITIAL } from '../js/museum/layout.js';

test('the 78 portraits occupy one room, 39 per level, without overlapping frames', () => {
  const slots = layoutWorks(PORTRAIT_SET_IDS.map(id => ({id})));
  assert.equal(slots.length, 78);
  assert.equal(new Set(slots.map(s => s.id)).size, 78);
  assert.ok(slots.every(s => s.hallIndex === 0));
  for (const floor of [0, 6.2]) {
    const level = slots.filter(s => s.floorY === floor);
    assert.equal(level.length, 39);
    for (let group = 0; group < 6; group++) {
      const composition = level.filter(s => s.composition === group);
      assert.equal(composition.length, 6);
      assert.equal(new Set(composition.map(s => s.y)).size, 2);
    }
    for (const a of level) for (const b of level) {
      if (a === b || a.rotation !== b.rotation) continue;
      const horizontal = Math.hypot(a.x-b.x, a.z-b.z);
      assert.ok(horizontal >= (a.format.width+b.format.width)/2+.2 ||
        Math.abs(a.y-b.y) >= (a.format.height+b.format.height)/2+.2,
        `Frames overlap: ${a.id}, ${b.id}`);
    }
  }
});

test('each portrait has a reachable viewpoint on its own floor', () => {
  for (const id of PORTRAIT_SET_IDS) {
    const slot = portraitSetSlot(id);
    const viewpoint = safeLevelViewpoint(slot.viewpoint);
    assert.ok(isLevelWalkable(viewpoint), `${slot.id} viewpoint`);
    assert.ok(findLevelPath({...INITIAL, floorY:0}, viewpoint).length, `${slot.id} route`);
  }
});

test('withdrawing a portrait leaves its place empty without moving the set', () => {
  const works = PORTRAIT_SET_IDS.slice(1).map(id => ({id}));
  const slots = layoutWorks(works);
  assert.equal(slots.length, 77);
  assert.equal(slots[0].id, 'portrait-1');
  assert.equal(slots.at(-1).id, 'portrait-77');
  assert.equal(portraitSetSlot('future-upload'), null);
});
