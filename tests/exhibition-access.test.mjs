import test from 'node:test';
import assert from 'node:assert/strict';
import { exhibitionAccess } from '../js/museum/exhibition-access.js';
import { setClosedDoors, insideObstacle, findPath, layoutWorks } from '../js/museum/navigation.js';
import { PORTRAIT_SET_IDS } from '../js/museum/portrait-set.js';
import { HALLS } from '../js/museum/layout.js';

test('beta closes nine empty rooms, blocks their entrances and reopens published rooms', t => {
  t.after(() => setClosedDoors([]));
  const slots = layoutWorks(PORTRAIT_SET_IDS.map(id => ({id})));
  const access = exhibitionAccess(slots);
  assert.equal(access.open.size, 1);
  assert.equal(access.doors.length, 9);
  setClosedDoors(access.doors);
  assert.equal(insideObstacle(-5,-13),false);
  for (const door of access.doors) {
    assert.equal(insideObstacle(door.x,door.z),true);
    assert.deepEqual(findPath({x:0,z:door.z},HALLS[door.hallIndex].entry),[]);
  }
  assert.ok(findPath({x:0,z:-13},HALLS[0].entry).length);
  const programmed = exhibitionAccess(slots,[{hallIndex:1}]);
  setClosedDoors(programmed.doors);
  assert.equal(insideObstacle(5,-13),false);
  assert.ok(findPath({x:0,z:-13},HALLS[1].entry).length);
});
