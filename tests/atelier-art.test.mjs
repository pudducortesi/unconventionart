import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {fixture} from './helpers/avatar-fixture.mjs';
import {instantiateAtelier} from '../vendor/avatar-runtime.js';
import {BODY_PRESETS,STUDIO_PRESETS} from '../js/museum/avatar-studio-state.js';
import {normalizeAvatar,DEFAULT_AVATAR} from '../js/museum/social-model.js';

test('body presets are distinct and coordinated looks remain valid portable profiles',()=>{
  assert.equal(new Set(BODY_PRESETS.map(p=>JSON.stringify(p.avatar))).size,5);
  for(const look of STUDIO_PRESETS){const value=normalizeAvatar(look.avatar);for(const [key,v]of Object.entries(look.avatar))assert.equal(value[key],v);}
  assert.equal(STUDIO_PRESETS.filter(p=>p.avatar.model==='atelier').length,6);
});

test('Atelier garments have distinct geometry and remain bound for every starting body',async()=>{
  const source=(await fixture()).scene;
  for(const body of BODY_PRESETS)for(const garment of ['tshirt','shirt','jacket','dress']){
    const avatar=instantiateAtelier(source,{...DEFAULT_AVATAR,...body.avatar,garment});
    assert.equal(!!avatar.getObjectByName('atelier-dress-skirt'),garment==='dress');assert.equal(!!avatar.getObjectByName('atelier-jacket-shell'),garment==='jacket');
    assert.equal(!!avatar.getObjectByName('atelier-collar--1'),['jacket','shirt'].includes(garment));
    for(let frame=0;frame<30;frame++){avatar.userData.animate(.033,frame*33,1,frame>15);avatar.updateMatrixWorld(true);}
    let triangles=0;
    avatar.traverse(o=>{assert.ok(o.matrixWorld.elements.every(Number.isFinite));if(!o.isMesh)return;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;
      if(o.isSkinnedMesh){o.skeleton.update();const p=o.geometry.attributes.position;for(let i=0;i<p.count;i+=31)assert.ok(o.applyBoneTransform(i,new T.Vector3().fromBufferAttribute(p,i)).toArray().every(Number.isFinite));}
    });
    assert.ok(triangles<40000,`${garment}: ${triangles}`);avatar.userData.dispose();
  }
});

test('generated garment geometry and materials are independently disposed exactly once',async()=>{
  const source=(await fixture()).scene,first=instantiateAtelier(source,{...DEFAULT_AVATAR,garment:'jacket'}),second=instantiateAtelier(source,{...DEFAULT_AVATAR,garment:'jacket'});
  const resources=new Map();first.traverse(o=>{if(!o.isMesh||!o.name.startsWith('atelier-'))return;for(const resource of [o.geometry,...(Array.isArray(o.material)?o.material:[o.material])])if(!resources.has(resource)){resources.set(resource,0);resource.addEventListener('dispose',()=>resources.set(resource,resources.get(resource)+1));}});
  assert.notEqual(first.getObjectByName('atelier-jacket-shell').geometry,second.getObjectByName('atelier-jacket-shell').geometry);
  first.userData.dispose();first.userData.dispose();assert.ok([...resources.values()].every(n=>n===1));
  second.userData.animate(.033,900,1,true);second.updateMatrixWorld(true);second.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));second.userData.dispose();
});

test('walking coordinates ankles and torso, blends gestures and settles all tracked joints',async()=>{
  const avatar=instantiateAtelier((await fixture()).scene,DEFAULT_AVATAR),names=['LeftFoot','RightFoot','Spine1','Spine2','Head','RightArm','RightForeArm','RightHand'];
  const bones=names.map(n=>avatar.getObjectByName(n)),rest=bones.map(b=>b.quaternion.clone()),hips=avatar.getObjectByName('Hips'),hipRest=hips.position.clone();
  for(let t=0;t<1000;t+=16)avatar.userData.animate(.016,t,1,false);
  assert.ok(bones.slice(0,4).every((b,i)=>b.quaternion.angleTo(rest[i])>1e-4));
  const before=bones[5].quaternion.clone();avatar.userData.animate(.016,1000,1,true);assert.ok(bones[5].quaternion.angleTo(before)<.5);
  for(let t=1016;t<1500;t+=16)avatar.userData.animate(.016,t,1,true);
  const face=avatar.getObjectByName('Human');assert.ok(face.morphTargetInfluences[face.morphTargetDictionary.mouthSmileLeft]>.2);
  let active=true;for(let t=1500;t<3000&&active;t+=16)active=avatar.userData.animate(.016,t,0,false);
  assert.equal(active,false);assert.equal(face.morphTargetInfluences[face.morphTargetDictionary.mouthSmileLeft],0);bones.forEach((b,i)=>assert.ok(b.quaternion.equals(rest[i])));assert.ok(hips.position.equals(hipRest));
  assert.equal(avatar.userData.animate(.016,3100,NaN,false),false);avatar.userData.dispose();
});

test('motion is stable across frame rates and supports a static reduced-motion gesture',async()=>{
  const source=(await fixture()).scene,avatars=[instantiateAtelier(source,DEFAULT_AVATAR),instantiateAtelier(source,DEFAULT_AVATAR)];
  for(const [i,dt]of [1/30,1/60].entries())for(let step=1;step<=Math.round(1/dt);step++)avatars[i].userData.animate(dt,step*dt*1000,1,true);
  for(const name of ['LeftUpLeg','RightFoot','Spine1','RightArm'])assert.ok(avatars[0].getObjectByName(name).quaternion.angleTo(avatars[1].getObjectByName(name).quaternion)<.025);
  const first=avatars[0];assert.equal(first.userData.animate(0,1100,0,true),true);assert.ok(first.getObjectByName('RightHand'));
  for(const avatar of avatars)avatar.userData.dispose();
});
