import {inviteCode} from './social-model.js';
const KEY='ua-meeting-bookmark-v1';
// The bookmark is a convenience only. Re-entry always goes through the server.
export function createMeetingBookmark(storage,now=Date.now){
  const clear=()=>{try{storage?.removeItem(KEY);}catch{}};
  function valid(value,userId){
    return value?.version===1&&value.userId===userId&&typeof value.invite==='string'&&value.invite===inviteCode(value.invite)&&
      typeof value.name==='string'&&value.name.trim().length>=2&&value.name.length<=60&&
      typeof value.expiresAt==='string'&&Number.isFinite(Date.parse(value.expiresAt))&&Date.parse(value.expiresAt)>now();
  }
  function read(userId){
    if(!userId)return null;
    try{const raw=storage?.getItem(KEY);if(!raw)return null;if(raw.length>2000){clear();return null;}
      const value=JSON.parse(raw);if(!valid(value,userId)){clear();return null;}return value;
    }catch{clear();return null;}
  }
  return {
    read,clear,
    remember(room,userId){
      const value={version:1,userId,invite:room?.invite,name:room?.name,expiresAt:room?.expires_at};
      if(!userId||!valid(value,userId)){clear();return;}
      try{storage?.setItem(KEY,JSON.stringify(value));}catch{clear();}
    },
    async resume(service){
      const userId=service.user?.id,saved=read(userId);
      if(!saved)throw Error('Nessun incontro da riprendere. Usa un invito valido.');
      try{
        const result=await service.rpc('join',{invite:saved.invite});
        if(service.user?.id!==userId)throw Error('La sessione è cambiata. Accedi di nuovo.');
        return result;
      }catch(error){
        if(['ua_invite_invalid','ua_room_denied','ua_suspended'].includes(error.code)&&service.user?.id===userId&&read(userId)?.invite===saved.invite)clear();
        throw error;
      }
    },
  };
}
