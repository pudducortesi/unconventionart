// Count only newly observed messages still available in the current room window.
export function createUnreadMessages(){
  let initialized=false,newest=-Infinity,seen=new Set(),unread=new Set();
  return {
    sync(messages,self,reading=false){
      const ids=new Set(messages.map(m=>m.id));
      unread=new Set([...unread].filter(id=>ids.has(id)));
      for(const m of messages){
        const time=Date.parse(m.created_at);
        if(initialized&&!reading&&m.user_id!==self&&!seen.has(m.id)&&Number.isFinite(time)&&time>=newest)unread.add(m.id);
      }
      for(const m of messages){const time=Date.parse(m.created_at);if(Number.isFinite(time))newest=Math.max(newest,time);}
      seen=ids;initialized=true;if(reading)unread.clear();return unread.size;
    },
    get count(){return unread.size;},
    markRead(){unread.clear();},
    reset(){initialized=false;newest=-Infinity;seen.clear();unread.clear();},
  };
}

export function createChatSender({getRoom,getDraft,setDraft,post}){
  let pending=null,revision=0,generation=0;
  return {
    get busy(){return pending!==null;},
    edited(){revision++;},
    reset(){generation++;revision++;pending=null;},
    async send(){
      if(pending)return false;
      const room=getRoom(),draft=getDraft(),body=draft.trim();
      if(!room)throw Error('Partecipa prima a un incontro.');
      if(!body||body.length>500)throw Error('Scrivi un messaggio tra 1 e 500 caratteri.');
      const job={generation,revision};pending=job;
      try{
        await post(room,body);
        if(job.generation!==generation||getRoom()!==room)return false;
        if(job.revision===revision&&getDraft()===draft)setDraft('');
        return true;
      }catch(error){if(job.generation!==generation||getRoom()!==room)return false;throw error;}
      finally{if(pending===job)pending=null;}
    },
  };
}
