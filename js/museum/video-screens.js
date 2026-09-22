import * as T from '../../vendor/three.module.js';
// Only the nearest programmed screen decodes video. Leaving a room releases it.
export function createVideoScreens({scene,videos=[],invalidate}) {
  const screens=[];
  scene.traverse(mesh=>{if(Number.isInteger(mesh.userData.videoHall))screens.push(mesh);});
  let active=null,disposed=false;
  function stop(){if(!active)return;const a=active;active=null;a.video.pause();a.video.removeAttribute('src');a.video.load();a.mesh.material=a.original;a.texture.dispose();a.material.dispose();}
  function start(mesh){
    const playlist=videos.filter(v=>v.hallIndex===mesh.userData.videoHall);if(!playlist.length)return;
    const video=document.createElement('video');video.crossOrigin='anonymous';video.muted=true;video.playsInline=true;video.preload='auto';
    const texture=new T.VideoTexture(video);texture.colorSpace=T.SRGBColorSpace;
    const material=new T.MeshBasicMaterial({map:texture,toneMapped:false});
    const a={mesh,video,texture,material,original:mesh.material,index:0};active=a;
    const next=()=>{if(active!==a)return;video.src=playlist[a.index%playlist.length].url;a.index++;video.play().catch(()=>{});};
    video.addEventListener('ended',next);video.addEventListener('loadeddata',()=>{if(active!==a)return;mesh.material=material;invalidate();});
    const frame=()=>{if(disposed||active!==a)return;invalidate();video.requestVideoFrameCallback?.(frame);};
    video.requestVideoFrameCallback?.(frame);next();
  }
  const pause=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',pause);
  return {
    update(player,enabled){
      let nearest=null,distance=22;
      if(enabled&&!document.hidden)for(const mesh of screens){if(!videos.some(v=>v.hallIndex===mesh.userData.videoHall))continue;const d=Math.hypot(player.x-mesh.position.x,player.z-mesh.position.z);if(d<distance){nearest=mesh;distance=d;}}
      if(active?.mesh!==nearest){stop();if(nearest)start(nearest);}
      if(active&&!active.video.paused&&!active.video.requestVideoFrameCallback)invalidate();
    },
    dispose(){disposed=true;stop();document.removeEventListener('visibilitychange',pause);}
  };
}
