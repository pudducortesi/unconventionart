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
