export async function connectRealtime({url,token,room,position,onSnapshot,onPoses,onLost}){
 const {Client}=await import('@colyseus/sdk');
 const client=new Client(url);let intentional=false;
 const connection=await client.joinOrCreate('visit',{meeting:room,token,position});
 connection.onMessage('snapshot',onSnapshot);connection.onMessage('poses',onPoses);
 connection.onLeave(()=>{if(!intentional)onLost();});connection.onError(()=>{if(!intentional)onLost();});
 return {send(pose){if(pose)connection.send('pose',pose);},dispose(){intentional=true;void connection.leave();}};
}
