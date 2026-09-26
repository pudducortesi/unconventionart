import {Room} from '@colyseus/core';
import {safePose} from '../../js/museum/social-model.js';
import {validId} from '../social-access.mjs';
export function createVisitRoom(access){
 return class VisitRoom extends Room{
  maxClients=16;peers=new Map();
  static async onAuth(_token,options){
   if(!validId(options.meeting)||!safePose(options.position))throw Error('Invalid meeting');
   const user=await access.user(options.token);
   if(!validId(user.id))throw Error('Invalid identity');
   let snapshot;
   for(let attempt=0;attempt<2;attempt++){try{snapshot=await access.snapshot(options.token,options.meeting,safePose(options.position));break;}catch(error){if(error.status!==429||attempt)throw error;await new Promise(resolve=>setTimeout(resolve,550));}}
   if(!snapshot.participants?.some(p=>p.id===user.id))throw Error('Membership required');
   return {id:user.id,meeting:options.meeting,token:options.token,snapshot};
  }
  onCreate(options){
   this.meeting=options.meeting;
   this.onMessage('pose',(client,data)=>{const peer=this.peers.get(client.sessionId),pose=safePose(data);if(!peer||!pose||Date.now()-peer.lastPose<70)return;peer.lastPose=Date.now();peer.pose=pose;});
   this.setSimulationInterval(()=>this.pushPoses(),100);
   this.clock.setInterval(()=>void this.refresh(),1000);
  }
  onJoin(client,options,auth){
   if(auth.meeting!==this.meeting||[...this.peers.values()].some(p=>p.id===auth.id))throw Error('Duplicate or mismatched membership');
   const peer={...auth,pose:safePose(options.position),lastPose:0,checking:false,allowed:new Set(auth.snapshot.participants.map(p=>p.id)),seen:Date.now()};
   this.peers.set(client.sessionId,peer);
  }
  onLeave(client){this.peers.delete(client.sessionId);}
  async refresh(){for(const client of this.clients){const p=this.peers.get(client.sessionId);if(!p||p.checking)continue;p.checking=true;
   void access.snapshot(p.token,this.meeting,p.pose).then(snapshot=>{
    if(this.peers.get(client.sessionId)!==p)return;
    if(!snapshot.participants?.some(person=>person.id===p.id))throw Error('Membership expired');
    p.allowed=new Set(snapshot.participants.map(person=>person.id));p.seen=Date.now();client.send('snapshot',snapshot);
   }).catch(()=>{p.allowed.clear();client.leave(4003);}).finally(()=>{p.checking=false;});
  }}
  pushPoses(){for(const client of this.clients){const recipient=this.peers.get(client.sessionId);if(!recipient||Date.now()-recipient.seen>2500)continue;
   client.send('poses',[...this.peers.values()].filter(p=>recipient.allowed.has(p.id)&&Date.now()-p.seen<2500).map(p=>({id:p.id,...p.pose})));
  }}
 };
}
