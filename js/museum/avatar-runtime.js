import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {VRMLoaderPlugin} from '../avatar-runtime/three-vrm.js';
import {normalizeAvatar} from './social-model.js';
import {attachGlasses} from './avatar-glasses.js';

let template;
function loadTemplate(){
  if(!template){const loader=new GLTFLoader();loader.register(parser=>new VRMLoaderPlugin(parser));
    template=fetch('/avatars/atelier-v1.glb',{signal:AbortSignal.timeout(15000)}).then(async response=>{if(!response.ok)throw Error('Avatar HTTP '+response.status);return loader.parseAsync(await response.arrayBuffer(),'/avatars/');}).catch(error=>{template=null;throw error;});}
  return template;
}
// Geometry/textures are shared across participants; skeletons and tinted materials are per visitor.
export function instantiateAtelier(source,a){
  a=normalizeAvatar(a);
  const root=new T.Group(),model=clone(source),materials=new Set(),extras=[];
  root.add(model);model.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y;
  if(!Number.isFinite(height)||height<.1)throw Error('Modello avatar non valido');
  model.scale.setScalar(1.74/height);model.position.y=-bounds.min.y*model.scale.y;
  model.rotation.y=Math.PI;root.updateMatrixWorld(true);
  const width={slim:.94,regular:1,broad:1.08}[a.build]||1;
  const expressions=[];let hairMesh;
  model.traverse(o=>{if(!o.isMesh)return;
    o.frustumCulled=false; // Bind-pose bounds do not cover animated hands/feet.
    const tint=mat=>{const m=mat.clone();materials.add(m);
      if(m.name.includes('body'))m.color.set(a.skin);
      if(m.name.includes('casualsuit'))m.color.set(a.outfit);
      if(m.name.includes('ponytail')||m.name.includes('eyebrows'))m.color.set(a.hair);
      return m;};
    o.material=Array.isArray(o.material)?o.material.map(tint):tint(o.material);
    if(o.name.includes('ponytail'))hairMesh=o;
    if(o.morphTargetDictionary)expressions.push(o);
  });
  // The authored ponytail is available as the long style; other styles use a small fitted cap.
  if(hairMesh)hairMesh.visible=a.style==='long';
  const head=model.getObjectByName('Head');
  if(head&&a.style!=='long'&&a.style!=='bald'){
    const group=new T.Group(),mat=new T.MeshStandardMaterial({color:a.hair,roughness:.85});materials.add(mat);
    const pos=head.getWorldPosition(new T.Vector3());group.position.copy(pos);root.worldToLocal(group.position);
    // Character faces -Z after normalization. Head origin is at the neck.
    const cap=new T.Mesh(new T.SphereGeometry(1,20,12,0,Math.PI*2,0,a.style==='shaved'?1.15:1.6),mat);
    cap.position.set(0,.16,.007);cap.scale.set(.090,a.style==='shaved'?.111:.119,.101);group.add(cap);extras.push(cap.geometry);
    if(a.style==='bun'){const geo=new T.SphereGeometry(.048,16,12),bun=new T.Mesh(geo,mat);bun.position.set(0,.18,.105);group.add(bun);extras.push(geo);}
    if(a.style==='mohawk'){const geo=new T.BoxGeometry(.027,.05,.13),crest=new T.Mesh(geo,mat);crest.position.set(0,.285,.01);group.add(crest);extras.push(geo);}
    if(a.style==='bob')for(const side of [-1,1]){const geo=new T.SphereGeometry(1,12,8),lock=new T.Mesh(geo,mat);lock.position.set(side*.078,.085,.022);lock.scale.set(.032,.111,.083);group.add(lock);extras.push(geo);}
    root.add(group);root.updateMatrixWorld(true);head.attach(group);
  }
  const frameColor={black:'#242329',tortoise:'#714b30',gold:'#a58143'}[a.frame]||'#242329';
  const disposeGlasses=head?attachGlasses(T,head,a.glasses,{y:.108,z:.122,eyes:.0325,radius:.026,color:frameColor}):()=>{};
  // Relax the authored A-pose before recording animation baselines.
  for(const [name,angle]of [['LeftArm',.62],['RightArm',-.62],['LeftUpLeg',.07],['RightUpLeg',-.07]]){
    const b=model.getObjectByName(name);if(!b)continue;
    const axis=new T.Vector3(0,0,1).applyQuaternion(b.getWorldQuaternion(new T.Quaternion()).invert());
    b.quaternion.multiply(new T.Quaternion().setFromAxisAngle(axis,angle));model.updateMatrixWorld(true);
  }
  const bones={};for(const name of ['LeftArm','RightArm','LeftForeArm','RightForeArm','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg','Head']){
    const bone=model.getObjectByName(name);if(bone){bones[name]={bone,rest:bone.quaternion.clone(),axis:new T.Vector3(1,0,0).applyQuaternion(bone.getWorldQuaternion(new T.Quaternion()).invert())};}
  }
  let stride=0,disposed=false;
  // Match the procedural avatar contract: frames are needed only until gait settles.
  root.userData.animate=(dt,time,speed=0,waving=false)=>{
    if(disposed)return false;const t=(Number.isFinite(time)?time:0)/1000;
    stride+=(T.MathUtils.clamp(speed,0,1)-stride)*(1-Math.exp(-Math.max(0,Math.min(.1,dt))*12));
    if(speed<=0&&stride<.001)stride=0;
    const rotate=(name,angle)=>{const b=bones[name];if(b)b.bone.quaternion.copy(b.rest).multiply(new T.Quaternion().setFromAxisAngle(b.axis,angle));};
    for(const [i,side]of ['Left','Right'].entries()){const wave=Math.sin(t*7+i*Math.PI)*stride;rotate(side+'UpLeg',wave*.30);rotate(side+'Leg',-Math.max(0,-wave)*.35);rotate(side+'Arm',-wave*.20);rotate(side+'ForeArm',-Math.max(0,wave)*.12);}
    if(waving){rotate('RightArm',-1.7+.14*Math.sin(t*10));rotate('RightForeArm',-.6+.18*Math.sin(t*10));}
    const blink=t%4.7,closed=blink<.16?1-Math.abs(blink-.08)/.08:0;
    for(const mesh of expressions)for(const key of ['eyeBlinkLeft','eyeBlinkRight']){const i=mesh.morphTargetDictionary[key];if(i!==undefined)mesh.morphTargetInfluences[i]=Math.max(0,closed);}
    return stride>0||waving;
  };
  root.userData.dispose=()=>{if(disposed)return;disposed=true;disposeGlasses();for(const m of materials)m.dispose();for(const g of extras)g.dispose();const skeletons=new Set();root.traverse(o=>{if(o.skeleton)skeletons.add(o.skeleton);});for(const s of skeletons)s.dispose();};
  root.scale.x=width;root.scale.y=a.height/100;
  return root;
}
export async function loadAtelier(a){const gltf=await loadTemplate();return instantiateAtelier(gltf.scene,a);}
