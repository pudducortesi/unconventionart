import test from 'node:test';
import assert from 'node:assert/strict';
import { welcomeRoute } from '../js/museum/welcome-route.js';
import { createBrandRelief } from '../js/museum/welcome-hall.js';
import { PORTRAIT_SET_IDS } from '../js/museum/portrait-set.js';
import { layoutWorks, setClosedDoors } from '../js/museum/navigation.js';
import { exhibitionAccess } from '../js/museum/exhibition-access.js';
import { INITIAL, HALLS, locateHall } from '../js/museum/layout.js';
import { isLevelWalkable, findLevelPath } from '../js/museum/level-navigation.js';

test('welcome itinerary walks from the foyer through both levels and back, with empty rooms closed',t=>{
  t.after(()=>setClosedDoors([]));
  const slots=layoutWorks(PORTRAIT_SET_IDS.map(id=>({id})));
  setClosedDoors(exhibitionAccess(slots).doors);
  assert.equal(locateHall(INITIAL),-1);
  assert.ok(INITIAL.z>0);
  let from={...INITIAL,floorY:0};
  for(const step of welcomeRoute(slots)){
    const to=step.position || (step.workIndex!==undefined ? slots[step.workIndex].viewpoint : HALLS[step.hallIndex].entry);
    assert.ok(isLevelWalkable(to),step.title+' must be walkable');
    if(Math.hypot(from.x-to.x,from.z-to.z, (from.floorY||0)-(to.floorY||0))>.1)
      assert.ok(findLevelPath(from,to).length,step.title+' must have a continuous route');
    from={...to,floorY:to.floorY||0};
  }
  assert.equal(from.z,INITIAL.z);
});
test('original identity is an extruded ten-metre relief with finite geometry',()=>{
  const geometry=createBrandRelief();
  geometry.computeBoundingBox();
  const bounds=geometry.boundingBox;
  assert.ok(bounds.max.x-bounds.min.x>9);
  assert.ok(bounds.max.z-bounds.min.z>.09);
  assert.ok(bounds.max.z-bounds.min.z<.12);
  assert.ok(geometry.attributes.position.count>100);
  assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
  geometry.dispose();
});
