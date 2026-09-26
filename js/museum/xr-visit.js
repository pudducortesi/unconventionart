import * as T from '../../vendor/three.module.js';
import { snapTurn } from './xr-input.js';
import { isLevelWalkable, moveOnLevels, findLevelPath } from './level-navigation.js';

// Uses the WebXRManager/session pattern from mrdoob/three.js (MIT).
// The same scene, collision model and social presence are retained in the headset.
export async function createXRVisit({renderer,scene,camera,player,button,notice,onStart,onEnd,update}) {
  let active=false,session=null,lastTime=0,first=true,disposed=false;
  const rig=new T.Group();rig.name='vr-visitor-rig';
  const raycaster=new T.Raycaster();raycaster.far=12;
  const tempMatrix=new T.Matrix4(),head=new T.Vector3(),before=new T.Vector3();
  const direction=new T.Vector3(),normal=new T.Vector3();
  const resources=[],controllers=[],armed=new Map();
  const own=r=>(resources.push(r),r);
  const lineGeo=own(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-1)]));
  const lineMat=own(new T.LineBasicMaterial({color:0x72d9bd}));
  const markerGeo=own(new T.RingGeometry(.18,.25,24));
  const markerMat=own(new T.MeshBasicMaterial({color:0x72d9bd,side:T.DoubleSide}));
  const marker=new T.Mesh(markerGeo,markerMat);marker.rotation.x=-Math.PI/2;marker.visible=false;rig.userData.xrIgnore=true;scene.add(marker);marker.userData.xrIgnore=true;
  function updateCamera(){rig.updateMatrixWorld(true);renderer.xr.updateCamera(camera);return renderer.xr.getCamera();}
  function anchor(x,z){const xr=updateCamera();xr.getWorldPosition(head);rig.position.x+=x-head.x;rig.position.z+=z-head.z;rig.position.y=player.floorY;updateCamera();}
  function target(controller){
    tempMatrix.extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0,0,-1).applyMatrix4(tempMatrix);
    const roots=scene.children.filter(o=>!o.userData.xrIgnore&&o.visible);
    const hit=raycaster.intersectObjects(roots,true).find(h=>h.object.visible);
    if(!hit?.object.userData.walkable||!hit.face)return null;
    if(hit.object.isInstancedMesh){hit.object.getMatrixAt(hit.instanceId,tempMatrix);tempMatrix.premultiply(hit.object.matrixWorld);}
    else tempMatrix.copy(hit.object.matrixWorld);
    normal.copy(hit.face.normal).transformDirection(tempMatrix);
    if(normal.y<.7)return null;
    const destination={x:hit.point.x,z:hit.point.z,floorY:hit.object.userData.mezzanine?Math.max(0,hit.point.y):0};
    return isLevelWalkable(destination)?destination:null;
  }
  function teleport(controller){
    const destination=target(controller);
    if(!destination||!findLevelPath(player,destination).length)return;
    Object.assign(player,destination);anchor(player.x,player.z);
  }
  renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');
  for(let i=0;i<2;i++){
    const controller=renderer.xr.getController(i),line=new T.Line(lineGeo,lineMat);line.scale.z=8;controller.add(line);rig.add(controller);
    const select=()=>teleport(controller);controller.addEventListener('select',select);controllers.push({controller,line,select});
  }
  function end(){
    active=false;session=null;renderer.setAnimationLoop(null);marker.visible=false;lastTime=0;
    rig.remove(camera);scene.remove(rig);camera.position.set(player.x,player.floorY+1.7,player.z);
    button.disabled=false;button.textContent='Entra in VR';onEnd();
  }
  function frame(time){
    if(!active||disposed)return;
    const dt=Math.min(.05,Math.max(0,(time-lastTime)/1000));lastTime=time;
    const xr=updateCamera();xr.getWorldPosition(head);
    if(first){anchor(player.x,player.z);first=false;}
    else {
      const next=moveOnLevels(player,head.x-player.x,head.z-player.z);
      Object.assign(player,next);anchor(player.x,player.z);
    }
    for(const source of session.inputSources){
      if(source.handedness==='left')continue;
      const turn=snapTurn(source.gamepad?.axes,armed.get(source)!==false);armed.set(source,turn.armed);
      if(turn.angle){rig.rotation.y+=turn.angle;anchor(player.x,player.z);}
    }
    marker.visible=false;
    for(const {controller,line} of controllers){
      const point=target(controller);
      if(point){marker.position.set(point.x,point.floorY+.04,point.z);marker.visible=true;line.scale.z=controller.getWorldPosition(before).distanceTo(marker.position);}
      else line.scale.z=8;
    }
    updateCamera().getWorldDirection(direction);
    update(dt,time,Math.atan2(-direction.x,-direction.z));
    renderer.setRenderTarget(null);renderer.render(scene,camera);
  }
  button.disabled=true;button.textContent='Verifica visore…';
  let supported=false;try{supported=!!navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr');}catch{}
  button.disabled=!supported;button.textContent=supported?'Entra in VR':'VR non disponibile qui';
  button.title=supported?'Visore: grilletto per teletrasportarti, levetta destra per girarti.':'Apri il sito nel browser di un visore WebXR compatibile.';
  button.onclick=async()=>{
    if(active){await session.end();return;}
    button.disabled=true;
    try{
      const next=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor']});
      if(disposed){await next.end();return;}
      onStart();session=next;next.addEventListener('end',end,{once:true});
      scene.add(rig);rig.add(camera);rig.position.set(player.x,player.floorY,player.z);rig.rotation.set(0,0,0);
      camera.position.set(0,0,0);camera.rotation.set(0,0,0);first=true;armed.clear();
      await renderer.xr.setSession(next);active=true;button.textContent='Esci dalla VR';button.disabled=false;
      renderer.setAnimationLoop(frame);
    }catch(error){if(session)await session.end();else onEnd();button.disabled=false;notice('Il visore non ha avviato la sessione. Puoi continuare la visita sullo schermo.');}
  };
  return {get active(){return active;},async dispose(){disposed=true;if(session)await session.end();for(const {controller,line,select} of controllers){controller.removeEventListener('select',select);controller.remove(line);}scene.remove(marker);resources.forEach(r=>r.dispose());}};
}
