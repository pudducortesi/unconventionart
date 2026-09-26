import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {createXRVisit} from '../js/museum/xr-visit.js';

for(const denied of [false,true]) test(`WebXR ${denied?'denial recovers':'session restores the desktop camera'}`,async t=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  const session=new EventTarget();session.inputSources=[];session.end=async()=>session.dispatchEvent(new Event('end'));
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{xr:{isSessionSupported:async()=>true,requestSession:async()=>{if(denied)throw Error('denied');return session;}}}});
  t.after(()=>{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;});
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(),player={x:0,z:2,floorY:0},button={};
  let loop=null,starts=0,ends=0,notices=0;
  const renderer={xr:{getController:()=>new T.Group(),setReferenceSpaceType(){},setSession:async()=>{},updateCamera(){},getCamera:()=>camera},setAnimationLoop:fn=>{loop=fn;}};
  const visit=await createXRVisit({renderer,scene,camera,player,button,notice:()=>notices++,onStart:()=>starts++,onEnd:()=>ends++,update(){}});
  assert.equal(button.disabled,false);
  await button.onclick();
  assert.equal(visit.active,!denied);
  if(!denied){assert.equal(starts,1);assert.equal(typeof loop,'function');assert.equal(camera.parent.name,'vr-visitor-rig');await session.end();assert.equal(camera.parent,null);assert.deepEqual(camera.position.toArray(),[0,1.7,2]);}
  else assert.equal(notices,1);
  assert.equal(ends,1);assert.equal(loop,null);assert.equal(visit.active,false);
  await visit.dispose();assert.equal(scene.children.length,0);
});
