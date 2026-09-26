import {Room,RoomEvent,Track} from 'livekit-client';
export async function connectVoice({credentials,context,onLost}){
 const room=new Room(),sources=new Map();let intentional=false;
 function detach(id){const source=sources.get(id);if(!source)return;source.input.disconnect();source.panner.disconnect();source.gain.disconnect();sources.delete(id);}
 room.on(RoomEvent.TrackSubscribed,(track,_publication,participant)=>{
  if(track.kind!==Track.Kind.Audio)return;detach(participant.identity);
  const input=context.createMediaStreamSource(new MediaStream([track.mediaStreamTrack])),panner=context.createPanner(),gain=context.createGain();
  panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=2;panner.maxDistance=25;panner.rolloffFactor=1;gain.gain.value=0;
  input.connect(panner).connect(gain).connect(context.destination);sources.set(participant.identity,{input,panner,gain});
 });
 room.on(RoomEvent.TrackUnsubscribed,(_track,_publication,participant)=>detach(participant.identity));
 room.on(RoomEvent.Disconnected,()=>{if(!intentional)onLost();});
 try{await room.connect(credentials.url,credentials.token);}catch(e){intentional=true;await room.disconnect();await context.close();throw e;}
 return {async microphone(enabled){await room.localParticipant.setMicrophoneEnabled(enabled);},update(listener,participants){
  if(!listener)return;const time=context.currentTime,l=context.listener;
  if(l.positionX){l.positionX.setValueAtTime(listener.x,time);l.positionY.setValueAtTime(listener.y+1.6,time);l.positionZ.setValueAtTime(listener.z,time);l.forwardX.setValueAtTime(-Math.sin(listener.yaw),time);l.forwardY.setValueAtTime(0,time);l.forwardZ.setValueAtTime(-Math.cos(listener.yaw),time);l.upX.setValueAtTime(0,time);l.upY.setValueAtTime(1,time);l.upZ.setValueAtTime(0,time);}
  const visible=new Map(participants.map(p=>[p.id,p]));
  for(const [id,s]of sources){const p=visible.get(id);s.gain.gain.setTargetAtTime(p?1:0,time,.08);if(p){s.panner.positionX.setValueAtTime(p.x,time);s.panner.positionY.setValueAtTime(p.y+1.6,time);s.panner.positionZ.setValueAtTime(p.z,time);}}
 },async dispose(){intentional=true;for(const id of [...sources.keys()])detach(id);await room.disconnect();await context.close();}};
}
