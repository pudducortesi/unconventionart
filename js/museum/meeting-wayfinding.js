import {HALLS,BOUNDS,locateHall} from './layout.js';
import {MEZZANINE_HEIGHT} from './mezzanine-layout.js';
import {findLevelPath,isLevelWalkable,moveOnLevels} from './level-navigation.js';
import {safePose} from './social-model.js';

function visitorPoint(value){
  const pose=safePose(value);
  if(!pose||pose.x<BOUNDS.minX||pose.x>BOUNDS.maxX||pose.z<BOUNDS.minZ||pose.z>BOUNDS.maxZ)return null;
  const point={x:pose.x,z:pose.z,floorY:pose.y};
  return isLevelWalkable(point)?point:null;
}
export function participantLocation(value,observer){
  const point=visitorPoint(value);
  if(!point)return 'Posizione non raggiungibile';
  const index=locateHall(point);
  const place=index<0?(point.z>0?'Hall d’ingresso':'Promenade'):HALLS[index].title;
  const level=point.floorY<.15?'piano terra':point.floorY<MEZZANINE_HEIGHT-.15?'scala':'soppalco';
  const origin=safePose(observer);
  const distance=origin?` · circa ${Math.round(Math.hypot(origin.x-point.x,origin.z-point.z,origin.y-point.floorY))} m`:'';
  return `${place} · ${level}${distance}`;
}

// A route is requested only for a currently visible peer in this meeting.
export function createMeetingPresence(now=()=>performance.now()){
  let peers=new Map(),self=null,updated=-Infinity;
  return {
    sync(participants,selfId){peers=new Map(participants.filter(p=>safePose(p)).map(p=>[p.id,{...p}]));self=selfId;updated=now();},
    get(id){return id!==self&&now()-updated<5000?peers.get(id)||null:null;},
    remove(id){peers.delete(id);},
    clear(){peers.clear();updated=-Infinity;},
  };
}

export function planMeetingRoute(start,value,canVisitHall=()=>true){
  const target=visitorPoint(value),from={x:start?.x,z:start?.z,floorY:start?.floorY??0};
  if(!target||!isLevelWalkable(from))return null;
  const hall=locateHall(target);
  if(hall>=0&&!canVisitHall(hall))return null;
  const direct=findLevelPath(from,target);
  if(!direct.length)return null;
  const look={x:target.x,y:target.floorY+1.5,z:target.z};
  let distance=0,last=from;
  for(const p of direct){distance+=Math.hypot(p.x-last.x,p.z-last.z,p.floorY-last.floorY);last=p;}
  if(distance<1.8)return {nearby:true,path:[],destination:from,look};
  // Move from the peer along walkable surfaces to find room to stand beside them.
  // The movement solver also follows stair height and avoids railings/atriums.
  const direction=Math.atan2(from.z-target.z,from.x-target.x);
  for(const offset of [0,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,3*Math.PI/4,-3*Math.PI/4,Math.PI]){
    const angle=direction+offset,destination=moveOnLevels(target,Math.cos(angle)*1.4,Math.sin(angle)*1.4);
    if(Math.hypot(destination.x-target.x,destination.z-target.z)<.9)continue;
    const path=findLevelPath(from,destination);
    if(path.length)return {nearby:false,path,destination,look};
  }
  return null;
}
