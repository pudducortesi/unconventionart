import {safePose} from './social-model.js';
export function createSocialConnections({service,getRoom,getPose,onSnapshot,onPoses,pausePolling,resumePolling,onStatus,onVoice}){
 let generation=0,voiceGeneration=0,realtime=null,voice=null,microphone=false,peers=[],lastSent=0,voicePending=false,micPending=false,capabilities={voice:false,realtime:null};
 async function available(){try{const r=await fetch('/api/social-session');if(r.ok)capabilities=await r.json();}catch{}return capabilities;}
 function stopVoice(){voiceGeneration++;const old=voice;voice=null;microphone=false;void old?.dispose();onVoice(false,false);}
 function stop(){generation++;realtime?.dispose();realtime=null;stopVoice();peers=[];}
 async function start(){const current=getRoom();if(!current)return;const token=++generation;await available();if(token!==generation||!capabilities.realtime)return;
  pausePolling();onStatus('Collegamento in tempo reale…');
  try{await new Promise(resolve=>setTimeout(resolve,550));if(token!==generation)return;const bearer=await service().connectionToken();const {connectRealtime}=await import('./social-realtime.js');if(token!==generation)return;
   const next=await connectRealtime({url:capabilities.realtime,token:bearer,room:current.id,position:safePose(getPose()),onSnapshot:data=>{if(token===generation)onSnapshot(data);},onPoses:data=>{if(token===generation)onPoses(data);},onLost:()=>{if(token===generation){generation++;realtime?.dispose();realtime=null;onStatus('Ripristino connessione standard…');resumePolling();}}});
   if(token!==generation){next.dispose();return;}realtime=next;onStatus('Collegato · tempo reale');
  }catch{if(token===generation){onStatus('Connessione standard attiva');resumePolling();}}
 }
 return {available,start,stop,stopVoice,sync(participants){peers=participants;},async toggleVoice(){
  if(voicePending)return;
  if(voice){stopVoice();return;}const current=getRoom();if(!current)throw Error('Entra prima in un incontro.');if(!capabilities.voice)throw Error('La voce non è ancora attiva.');
  const token=generation,voiceToken=++voiceGeneration,context=new AudioContext();voicePending=true;
  try{await context.resume();const bearer=await service().connectionToken();const r=await fetch('/api/social-session',{method:'POST',headers:{Authorization:`Bearer ${bearer}`,'Content-Type':'application/json'},body:JSON.stringify({room:current.id,invite:current.invite})});const credentials=await r.json();if(!r.ok)throw Error(credentials.error||'Voce non disponibile');
   const {connectVoice}=await import('./social-voice.js');if(token!==generation||voiceToken!==voiceGeneration){await context.close();return;}
   const next=await connectVoice({credentials,context,onLost:()=>{if(voiceToken===voiceGeneration)stopVoice();}});if(token!==generation||voiceToken!==voiceGeneration){await next.dispose();return;}voice=next;onVoice(true,false);
  }catch(e){if(context.state!=='closed')await context.close();throw e;}finally{voicePending=false;}
 },async toggleMicrophone(){if(!voice||micPending)return;const current=voice,enabled=!microphone;micPending=true;try{await current.microphone(enabled);if(voice===current){microphone=enabled;onVoice(true,microphone);}}finally{micPending=false;}},update(time){const pose=safePose(getPose());if(realtime&&time-lastSent>100){lastSent=time;realtime.send(pose);}voice?.update(pose,peers);}};
}
