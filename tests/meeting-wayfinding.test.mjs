import test from 'node:test';
import assert from 'node:assert/strict';
import {participantLocation,createMeetingPresence,planMeetingRoute} from '../js/museum/meeting-wayfinding.js';
import {HALLS,INITIAL} from '../js/museum/layout.js';
import {MEZZANINES} from '../js/museum/mezzanine-layout.js';
import {isLevelWalkable,moveOnLevels} from '../js/museum/level-navigation.js';
const start={...INITIAL,floorY:0};
const peer=point=>({id:'peer',name:'Visitor',x:point.x,z:point.z,y:point.floorY??0,yaw:0});
const landing=m=>({x:m.stair.x,z:m.stair.minZ-.65,floorY:m.height});
function follow(from,plan){
  let position={...from};
  for(const point of plan.path){
    let remaining=Math.hypot(point.x-position.x,point.z-position.z),steps=0;
    while(remaining>1e-5&&steps++<5000){
      const scale=Math.min(1,.1/remaining),next=moveOnLevels(position,(point.x-position.x)*scale,(point.z-position.z)*scale);
      assert.ok(isLevelWalkable(next));assert.ok(Math.hypot(next.x-position.x,next.z-position.z)>1e-7,'No blocked waypoint');
      assert.ok(Math.abs(next.floorY-position.floorY)<.1,'Stairs must be continuous');
      position=next;remaining=Math.hypot(point.x-position.x,point.z-position.z);
    }
    assert.ok(steps<5000);assert.ok(Math.abs(position.floorY-point.floorY)<1e-5);
  }
  assert.ok(Math.hypot(position.x-plan.destination.x,position.z-plan.destination.z)<1e-5);
}
test('Meeting locations identify entrance, hall, stairs and mezzanine with approximate distances',()=>{
  const m=MEZZANINES[0];
  assert.match(participantLocation(peer(start)),/Hall d’ingresso · piano terra/);
  assert.match(participantLocation(peer({x:0,z:-13})),/Promenade/);
  assert.match(participantLocation(peer(landing(m)),peer(start)),/Sala 01.*soppalco · circa \d+ m/);
  assert.match(participantLocation(peer({x:m.stair.x,z:m.stair.z,floorY:m.height/2})),/scala/);
  assert.equal(participantLocation({x:90,z:3,y:0}),'Posizione non raggiungibile');
  assert.equal(participantLocation({x:0,z:3,y:6.2}),'Posizione non raggiungibile');
});
test('Raggiungi takes physical paths to nearby ground, stair and upper-floor positions',()=>{
  const m=MEZZANINES[0];
  for(const target of [{...HALLS[0].entry,floorY:0},landing(m),{x:m.stair.x,z:m.stair.z,floorY:m.height/2}]){
    const plan=planMeetingRoute(start,peer(target));assert.ok(plan&&!plan.nearby);follow(start,plan);
    const gap=Math.hypot(plan.destination.x-target.x,plan.destination.z-target.z);
    assert.ok(gap>=.9&&gap<=1.5,'Keep room to stand beside the avatar');
    assert.equal(plan.look.y,target.floorY+1.5);
  }
});
test('Reaching another mezzanine descends and ascends instead of crossing the void',()=>{
  const from=landing(MEZZANINES[0]),target=landing(MEZZANINES[9]);
  const plan=planMeetingRoute(from,peer(target));assert.ok(plan);assert.ok(plan.path.some(p=>p.floorY===0));follow(from,plan);
});
test('Closed halls, nonfinite poses and positions outside walkable surfaces cannot create routes',()=>{
  for(const pose of [peer(landing(MEZZANINES[1])),{x:Infinity,z:3,y:0},{x:90,z:3,y:0},{x:0,z:3,y:6.2}])assert.equal(planMeetingRoute(start,pose,()=>false),null);
  assert.equal(planMeetingRoute({x:Infinity,z:3},peer(start)),null);
});
test('Nearby uses walking distance, so a wall cannot produce a false arrival',()=>{
  assert.equal(planMeetingRoute(start,peer({...start,x:1})).nearby,true);
  const from={x:-4,z:-8,floorY:0},target={x:-6,z:-8,floorY:0};
  const plan=planMeetingRoute(from,peer(target));assert.ok(plan&&!plan.nearby);follow(from,plan);
});
test('Reaching a peer uses the latest room snapshot and refuses self, stale or removed presences',()=>{
  let clock=0;const presence=createMeetingPresence(()=>clock),a=peer(start);
  presence.sync([a,{...a,id:'self'}],'self');assert.equal(presence.get('self'),null);assert.equal(presence.get('peer').x,0);
  presence.sync([{...a,x:2}],'self');assert.equal(presence.get('peer').x,2);
  clock=5000;assert.equal(presence.get('peer'),null);
  presence.sync([a],'self');presence.remove('peer');assert.equal(presence.get('peer'),null);
  presence.sync([a],'self');presence.sync([],'self');assert.equal(presence.get('peer'),null);
  presence.sync([a],'self');presence.clear();assert.equal(presence.get('peer'),null);
});
