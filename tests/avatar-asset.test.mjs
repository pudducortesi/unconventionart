import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {instantiateAtelier} from '../vendor/avatar-runtime.js';
import {DEFAULT_AVATAR} from '../js/museum/social-model.js';

import {fixture} from './helpers/avatar-fixture.mjs';
test('Curated avatar matches reviewed artifact, has a complete skeleton and bounded geometry',async()=>{
  const b=await readFile('avatars/atelier-v1.glb'),report=JSON.parse(await readFile('avatars/atelier-v1.report.json'));
  assert.equal(createHash('sha256').update(b).digest('hex'),report.optimizedSHA256);assert.ok(b.length<2*1024*1024);
  const gltf=await fixture();let triangles=0;gltf.scene.traverse(o=>{if(o.isMesh)triangles+=o.geometry.index.count/3;});assert.ok(triangles<25000);
  for(const n of ['Hips','Head','LeftArm','RightArm','LeftLeg','RightLeg'])assert.ok(gltf.scene.getObjectByName(n));
  const a=instantiateAtelier(gltf.scene,{...DEFAULT_AVATAR,style:'bob'}),bAvatar=instantiateAtelier(gltf.scene,{...DEFAULT_AVATAR,style:'long'});
  assert.notEqual(a.getObjectByName('Head'),bAvatar.getObjectByName('Head'));
  let changed=false;a.traverse(o=>{if(o.isSkinnedMesh){assert.ok(o.skeleton.bones.length>10);for(const material of (Array.isArray(o.material)?o.material:[o.material]))material.addEventListener('dispose',()=>changed=true);}});
  for(let t=0;t<3000;t+=33)a.userData.animate(.033,t,1);
  a.updateMatrixWorld(true);a.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
  a.userData.dispose();assert.equal(changed,true);bAvatar.userData.animate(.033,3000,1);bAvatar.userData.dispose();
});

test('Atelier returns to its exact authored rest pose before releasing animation frames',async()=>{
  const avatar=instantiateAtelier((await fixture()).scene,DEFAULT_AVATAR);
  const bones=['LeftArm','RightArm','LeftForeArm','RightForeArm','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg'].map(name=>avatar.getObjectByName(name));
  const rest=bones.map(bone=>bone.quaternion.clone());
  for(let t=0;t<1000;t+=16)assert.equal(avatar.userData.animate(.016,t,1),true);
  assert.ok(bones.some((bone,i)=>bone.quaternion.angleTo(rest[i])>.01));
  let active=true,frames=0;
  while(active&&frames<300)active=avatar.userData.animate(.016,1000+(++frames)*16,0);
  assert.equal(active,false);assert.ok(frames<300);
  bones.forEach((bone,i)=>assert.ok(bone.quaternion.equals(rest[i])));
  assert.equal(avatar.userData.animate(.016,10000,0),false);
  avatar.userData.dispose();assert.equal(avatar.userData.animate(.016,10016,1),false);
});
test('Atelier wave lifts its arm and returns to rest when the gesture ends',async()=>{
  const avatar=instantiateAtelier((await fixture()).scene,DEFAULT_AVATAR);
  const arm=avatar.getObjectByName('RightArm'),forearm=avatar.getObjectByName('RightForeArm');
  const restArm=arm.quaternion.clone(),restForearm=forearm.quaternion.clone();
  assert.equal(avatar.userData.animate(.016,1000,0,true),true);
  assert.ok(arm.quaternion.angleTo(restArm)>.5);
  assert.ok(forearm.quaternion.angleTo(restForearm)>.2);
  assert.equal(avatar.userData.animate(.016,1016,0,false),false);
  assert.ok(arm.quaternion.equals(restArm));assert.ok(forearm.quaternion.equals(restForearm));
  avatar.userData.dispose();
});
test('Atelier eyewear sits on the independently cloned head and releases resources',async()=>{
  const source=(await fixture()).scene;
  const a=instantiateAtelier(source,{...DEFAULT_AVATAR,glasses:'round',frame:'gold'});
  const b=instantiateAtelier(source,{...DEFAULT_AVATAR,glasses:'square'});
  const head=a.getObjectByName('Head'),glasses=head.getObjectByName('avatar-glasses');
  assert.ok(glasses);assert.equal(glasses.parent,head);
  assert.notEqual(glasses,b.getObjectByName('avatar-glasses'));
  assert.ok(glasses.position.z>.10&&glasses.position.z<.14);
  const rim=glasses.children.find(o=>o.geometry?.type==='TorusGeometry');assert.ok(rim);
  let disposed=0;rim.geometry.addEventListener('dispose',()=>disposed++);
  const before=rim.getWorldPosition(new T.Vector3());
  head.rotation.y=.4;a.updateMatrixWorld(true);
  assert.ok(rim.getWorldPosition(new T.Vector3()).distanceTo(before)>0);
  a.userData.dispose();a.userData.dispose();assert.equal(disposed,1);
  b.userData.animate(.016,16,1);b.userData.dispose();
});
export {fixture};
