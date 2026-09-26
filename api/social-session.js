import {AccessToken,TrackSource} from 'livekit-server-sdk';
import {createSocialAccess,validId} from '../server/social-access.mjs';
import publishing from '../data/publishing.json' with {type:'json'};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const voice=!!(process.env.LIVEKIT_URL&&process.env.LIVEKIT_API_KEY&&process.env.LIVEKIT_API_SECRET);
 const realtime=process.env.COLYSEUS_URL||null;
 if(req.method==='GET')return res.status(200).json({voice,realtime});
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!voice)return res.status(503).json({error:'La voce non è ancora attiva.'});
 try{
  const token=req.headers.authorization?.replace(/^Bearer /,'');const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!body||!validId(body.room)||!validId(body.invite))return res.status(400).json({error:'Invito non valido.'});
  const access=createSocialAccess({url:publishing.supabaseUrl,key:publishing.publishableKey});
  const user=await access.user(token);const room=await access.join(token,body.invite);
  if(!validId(user.id)||room.id!==body.room)return res.status(403).json({error:'Incontro non accessibile.'});
  const grant=new AccessToken(process.env.LIVEKIT_API_KEY,process.env.LIVEKIT_API_SECRET,{identity:user.id,ttl:'5m'});
  grant.addGrant({roomJoin:true,room:room.id,canPublish:true,canSubscribe:true,canPublishData:false,canPublishSources:[TrackSource.MICROPHONE]});
  return res.status(200).json({url:process.env.LIVEKIT_URL,token:await grant.toJwt()});
 }catch(error){return res.status(error.status===429?429:403).json({error:error.status===429?'Attendi un momento e riprova.':'Accesso voce non riuscito.'});}
}
