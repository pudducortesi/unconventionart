// One request at a time. Responses from a previous room/visibility state are ignored.
export function createSocialPoller({request,onData,onError,schedule=setTimeout,cancel=clearTimeout}) {
  let active=false,generation=0,timer=null,running=false,failures=0;
  const clear=()=>{if(timer!==null)cancel(timer);timer=null;};
  async function poll(token){
    if(!active||running||token!==generation)return;
    running=true;
    try{
      const data=await request();
      if(active&&token===generation){failures=0;onData(data);}
    }catch(error){
      if(active&&token===generation){failures++;onError(error);}
    }finally{
      running=false;
      if(active)timer=schedule(()=>{timer=null;poll(generation);},Math.min(10000,1000*Math.max(1,failures)));
    }
  }
  return {
    start(){active=true;generation++;failures=0;clear();poll(generation);},
    stop(){active=false;generation++;clear();},
  };
}
