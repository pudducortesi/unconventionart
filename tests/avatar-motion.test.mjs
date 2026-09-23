import test from 'node:test';
import assert from 'node:assert/strict';
import {createAvatar,createAvatarLayer} from '../js/museum/social-avatar.js';
import * as T from '../vendor/three.module.js';

test('Gait keeps articulated joints attached and returns to rest without nonfinite transforms',()=>{
  const avatar=createAvatar({style:'long'}),arm=avatar.getObjectByName('leftUpperArm'),elbow=arm.getObjectByName('elbow');
  const local=elbow.position.clone();
  for(let t=0;t<2000;t+=16)avatar.userData.animate(.016,t,1);
  assert.ok(Math.abs(arm.rotation.x)>.01);assert.ok(elbow.position.equals(local));
  for(let t=2000;t<4000;t+=16)avatar.userData.animate(.016,t,0);
  assert.ok(Math.abs(arm.rotation.x)<.0001);
  avatar.updateMatrixWorld(true);let triangles=0;
  avatar.traverse(o=>{assert.ok(o.matrixWorld.elements.every(Number.isFinite));if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
  assert.ok(triangles<30000,`${triangles} triangles`);
  const disposed=new Map();avatar.traverse(o=>{if(o.geometry&&!disposed.has(o.geometry)){disposed.set(o.geometry,0);o.geometry.addEventListener('dispose',()=>disposed.set(o.geometry,disposed.get(o.geometry)+1));}});
  avatar.userData.dispose();avatar.userData.dispose();assert.ok([...disposed.values()].every(v=>v===1));
});

test('Peer movement interpolates through shortest turn, replacement/removal releases meshes',()=>{
  const scene=new T.Scene(),layer=createAvatarLayer(scene,()=>{});
  const p={id:'peer',name:'',avatar:{},x:0,y:0,z:0,yaw:Math.PI-.05};
  layer.sync([p],'self');const old=scene.children[0];
  layer.sync([{...p,x:1,yaw:-Math.PI+.05}],'self');assert.equal(layer.update(.016,1000),true);assert.ok(old.position.x>0&&old.position.x<1);assert.ok(Math.abs(old.rotation.y-Math.PI)<.1);
  layer.sync([{...p,avatar:{style:'long'}}],'self');assert.notEqual(scene.children[0],old);assert.equal(scene.children.length,1);
  layer.sync([],'self');assert.equal(scene.children.length,0);assert.equal(layer.update(.016,2000),false);layer.clear();
});

test('Peer gait finishes after arrival, then releases the gallery render loop',()=>{
  const scene=new T.Scene(),layer=createAvatarLayer(scene,()=>{});
  const p={id:'peer',name:'',avatar:{},x:0,y:0,z:0,yaw:0};
  layer.sync([p],'self');const mesh=scene.children[0];
  layer.sync([{...p,x:3,yaw:.8}],'self');
  let active=true,frames=0,settledPoseWhileGaitActive=false;
  while(active&&frames<300){
    active=layer.update(.016,++frames*16);
    if(mesh.position.x===3&&active)settledPoseWhileGaitActive=true;
  }
  assert.equal(settledPoseWhileGaitActive,true,'Keep rendering after arrival to finish the gait');
  assert.equal(active,false,'A resting peer must not keep the gallery rendering');
  assert.ok(frames<300);assert.equal(mesh.position.x,3);assert.equal(mesh.rotation.y,.8);
  for(const name of ['leftUpperArm','rightUpperArm','leftUpperLeg','rightUpperLeg','knee'])assert.ok(Math.abs(mesh.getObjectByName(name).rotation.x)<1e-12,`${name} reaches rest`);
  for(const time of [5000,10000,15000])assert.equal(layer.update(.016,time),false);
  layer.clear();
});

test('Procedural glasses follow the head and dispose independently',()=>{
  for(const style of ['round','square']){
    const avatar=createAvatar({glasses:style,frame:'gold'}),head=avatar.getObjectByName('head');
    const glasses=head.getObjectByName('avatar-glasses');
    assert.ok(glasses);assert.equal(glasses.parent,head);
    const before=glasses.getWorldPosition(new T.Vector3());
    head.rotation.y=.5;avatar.updateMatrixWorld(true);
    assert.ok(glasses.getWorldPosition(new T.Vector3()).distanceTo(before)>0);
    const materials=new Set();glasses.traverse(o=>{if(o.isMesh)materials.add(o.material);});
    assert.equal(materials.size,1);
    const material=[...materials][0];let disposals=0;material.addEventListener('dispose',()=>disposals++);
    avatar.userData.dispose();avatar.userData.dispose();
    assert.equal(disposals,1);
  }
  assert.equal(createAvatar({glasses:'bad-url'}).getObjectByName('avatar-glasses'),undefined);
});

test('Peer wave raises the arm only during the gesture and releases frames after it ends',()=>{
  const scene=new T.Scene(),layer=createAvatarLayer(scene,()=>{}),p={id:'peer',name:'',avatar:{},x:0,y:0,z:0,yaw:0};
  layer.sync([{...p,wave:true}],'self');const arm=scene.children[0].getObjectByName('rightUpperArm');
  assert.equal(layer.update(.016,1000),true);assert.ok(arm.rotation.z>2);
  layer.sync([{...p,wave:false}],'self');assert.equal(layer.update(.016,1016),false);assert.equal(arm.rotation.z,.075);
  layer.clear();
});
