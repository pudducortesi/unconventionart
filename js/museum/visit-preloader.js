// At most two speculative image requests; visible texture loading stays first.
export function createVisitPreloader(slots, resolve) {
  const done=new Set();let queue=[],active=0,disposed=false;
  const pump=()=>{
    while(!disposed&&active<2&&queue.length){
      const url=queue.shift();if(done.has(url))continue;done.add(url);active++;
      Promise.resolve().then(()=>resolve(url)).catch(()=>done.delete(url)).finally(()=>{active--;pump();});
    }
  };
  return {
    approach(point){
      if(!point||disposed)return;
      queue=[...slots].sort((a,b)=>Math.hypot(a.x-point.x,a.z-point.z,(a.floorY||0)-(point.floorY||0))-Math.hypot(b.x-point.x,b.z-point.z,(b.floorY||0)-(point.floorY||0)))
        .slice(0,8).map(s=>s.work.mobilePreview||s.work.preview||s.work.image).filter(url=>url&&!done.has(url));pump();
    },
    dispose(){disposed=true;queue=[];},
  };
}
