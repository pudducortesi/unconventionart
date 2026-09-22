import * as T from '../../vendor/three.module.js';
import config from '../../data/welcome-video.json';

// One video element is shared by the wall and the accessible player. It starts
// buffering in the hall and keeps its buffer when the visitor moves away.
export function prepareWelcomeFilm(invalidate, media = config) {
  const video=document.querySelector('#welcome-film-video');
  const status=document.querySelector('#welcome-film-status');
  let mesh,original,texture,material,disposed=false,ready=false;
  video.muted=true;video.playsInline=true;video.preload='auto';video.loop=true;
  if(media.poster)video.poster=media.poster;
  const present=()=>{
    if(disposed||!mesh||!ready)return;
    texture ||= new T.VideoTexture(video);texture.colorSpace=T.SRGBColorSpace;
    material ||= new T.MeshBasicMaterial({map:texture,toneMapped:false});
    mesh.material=material;
    const ratio=video.videoWidth/video.videoHeight;
    if(ratio>0)mesh.scale.set(Math.min(1,ratio/2),Math.min(1,2/ratio),1);
    status.textContent='';invalidate();
  };
  const buffered=()=>{
    if(disposed)return;
    const enough=video.readyState>=4 || (video.readyState>=3 && video.buffered.length && video.buffered.end(0)-video.currentTime>=Math.min(3,Number.isFinite(video.duration)?video.duration:3));
    if(enough){ready=true;present();}
  };
  for(const event of ['canplay','canplaythrough','progress'])video.addEventListener(event,buffered);
  video.addEventListener('error',()=>{ready=false;if(mesh){mesh.material=original;mesh.scale.set(1,1,1);}status.textContent='Presentazione temporaneamente non disponibile.';invalidate();});
  const frame=()=>{if(disposed)return;if(!video.paused)invalidate();video.requestVideoFrameCallback?.(frame);};
  if(media.url){video.crossOrigin='anonymous';video.src=media.url;video.hidden=false;video.load();status.textContent='Preparazione della presentazione…';video.requestVideoFrameCallback?.(frame);}
  else {video.hidden=true;status.textContent='Il video di presentazione sarà disponibile qui.';}
  const suspend=()=>{if(document.hidden)video.pause();};
  document.addEventListener('visibilitychange',suspend);
  return {
    attach(screen){mesh=screen;original=mesh.material;present();},
    update(point,enabled){
      if(disposed||!media.url)return;
      const dialog=document.querySelector('#welcome-film').open;
      if(dialog&&!document.hidden)return; // Native controls own play, pause and sound.
      video.muted=true;
      const nearby=enabled&&point.z>-.5&&Math.hypot(point.x-16,point.z-.34)<24;
      if(!document.hidden&&ready&&(dialog||nearby)){if(video.paused)video.play().catch(()=>{});if(!video.requestVideoFrameCallback)invalidate();}
      else if(!video.paused)video.pause();
    },
    dispose(){disposed=true;document.removeEventListener('visibilitychange',suspend);video.pause();video.removeAttribute('src');video.load();texture?.dispose();material?.dispose();},
  };
}
