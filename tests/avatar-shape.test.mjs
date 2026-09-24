import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {fixture} from './helpers/avatar-fixture.mjs';
import {shapeAtelier,createShapeField} from '../js/museum/avatar-shape.js';
import {instantiateAtelier} from '../vendor/avatar-runtime.js';
import {DEFAULT_AVATAR,AVATAR_RANGES} from '../js/museum/social-model.js';

test('default shaping retains shared source geometry without allocations',async()=>{
  const source=(await fixture()).scene,model=clone(source);const before=[];model.traverse(o=>{if(o.isMesh)before.push(o.geometry);});
  shapeAtelier(T,model,DEFAULT_AVATAR)();let i=0;model.traverse(o=>{if(o.isMesh)assert.equal(o.geometry,before[i++]);});
});
test('shaping isolates geometry and preserves a valid bind pose for body, clothing and facial parts',async()=>{
  const source=(await fixture()).scene,model=clone(source),original=new Map();source.traverse(o=>{if(o.isMesh)original.set(o.name,{geometry:o.geometry,position:o.geometry.attributes.position.array.slice()});});
  const inverses=[];source.traverse(o=>{if(o.isSkinnedMesh)inverses.push([o.skeleton,o.skeleton.boneInverses.map(m=>m.elements.slice())]);});
  const a={...DEFAULT_AVATAR,...Object.fromEntries(Object.entries(AVATAR_RANGES).map(([key,[,max]])=>[key,max]))};
  const dispose=shapeAtelier(T,model,a);model.updateMatrixWorld(true);let moved=0,disposed=0;
  model.traverse(o=>{if(!o.isMesh)return;const ref=original.get(o.name);assert.notEqual(o.geometry,ref.geometry);o.geometry.addEventListener('dispose',()=>disposed++);
    const positions=o.geometry.attributes.position;let changed=false;
    if(o.isSkinnedMesh)o.skeleton.update();
    for(let i=0;i<positions.count;i++){
      const p=new T.Vector3().fromBufferAttribute(positions,i);assert.ok(p.toArray().every(Number.isFinite));
      if(o.isSkinnedMesh)assert.ok(o.applyBoneTransform(i,p.clone()).distanceTo(p)<1e-5,'rest bind mismatch '+o.name);
      if(Math.abs(p.x-ref.position[i*3])>1e-6)changed=true;
    }
    if(changed)moved++;
    for(const attr of o.geometry.morphAttributes.position||[])assert.ok(attr.array.every(Number.isFinite));
    assert.deepEqual(ref.geometry.attributes.position.array,ref.position);
  });
  for(const [skeleton,matrices]of inverses)assert.deepEqual(skeleton.boneInverses.map(m=>m.elements),matrices);
  assert.ok(moved>=5,'body, outfit, eyes, hair and face should all participate');dispose();dispose();assert.equal(disposed,original.size);
});
test('extreme shaped avatars retain finite walking, waving and independent skeletons',async()=>{
  const source=(await fixture()).scene;
  for(const edge of [0,1]){
    const config={...DEFAULT_AVATAR,...Object.fromEntries(Object.entries(AVATAR_RANGES).map(([k,v])=>[k,v[edge]]))};
    const avatar=instantiateAtelier(source,config);
    for(let frame=0;frame<50;frame++){avatar.userData.animate(.033,frame*33,1,frame>20);avatar.updateMatrixWorld(true);}
    avatar.traverse(o=>{assert.ok(o.matrixWorld.elements.every(Number.isFinite));if(o.isSkinnedMesh){o.skeleton.update();assert.ok(o.skeleton.boneMatrices.every(Number.isFinite));}});
    avatar.userData.dispose();
  }
});
test('shape field stays orientation-preserving across face and torso at range extremes',()=>{
  const landmarks={head:new T.Vector3(0,1.558,.024),eyes:[new T.Vector3(.0324,1.652,.127),new T.Vector3(-.0324,1.652,.127)],hips:new T.Vector3(0,.971,.021),waist:new T.Vector3(0,1.086,.023),shoulders:new T.Vector3(.181,1.398,.020)};
  const step=.0001;
  for(const edge of [0,1]){
    const a={...DEFAULT_AVATAR,...Object.fromEntries(Object.entries(AVATAR_RANGES).map(([k,v])=>[k,v[edge]]))},field=createShapeField(a,landmarks);
    for(let y=.7;y<1.81;y+=.025)for(let x=-.2;x<=.2;x+=.025)for(let z=-.1;z<.21;z+=.025){
      const p=new T.Vector3(x,y,z),base=field.map(p,new T.Vector3()),columns=[];
      for(const axis of ['x','y','z']){const offset=p.clone();offset[axis]+=step;columns.push(field.map(offset,new T.Vector3()).sub(base).divideScalar(step));}
      const determinant=columns[0].dot(columns[1].clone().cross(columns[2]));assert.ok(determinant>.15,`fold at ${x},${y},${z}: ${determinant}`);
    }
  }
});

test('Atelier outfit uses two material groups and shoes follow animated feet without sharing resources',async()=>{
  const source=(await fixture()).scene,avatar=instantiateAtelier(source,{...DEFAULT_AVATAR,trousers:'#793a57',shoes:'#714b30'});
  const outfit=avatar.getObjectByName('Humanfemale_casualsuit01');assert.equal(outfit.material.length,2);assert.equal(outfit.geometry.groups.length,2);
  assert.equal(outfit.material[1].color.getHexString(),'793a57');
  assert.equal(outfit.geometry.groups.reduce((n,g)=>n+g.count,0),outfit.geometry.index.count);
  assert.ok(outfit.geometry.groups.every(g=>g.count>0));
  for(const side of ['Left','Right']){
    const shoe=avatar.getObjectByName('atelier-shoe-'+side);assert.equal(shoe.parent.name,side+'Foot');
    assert.equal(shoe.children[0].material.color.getHexString(),'714b30');const before=shoe.getWorldPosition(new T.Vector3());
    avatar.userData.animate(.1,side==='Left'?220:440,1);avatar.updateMatrixWorld(true);assert.ok(shoe.getWorldPosition(new T.Vector3()).distanceTo(before)>.0001);
  }
  let disposed=0;outfit.material[1].addEventListener('dispose',()=>disposed++);avatar.userData.dispose();avatar.userData.dispose();assert.equal(disposed,1);
  assert.equal(Array.isArray(source.getObjectByName('Humanfemale_casualsuit01').material),false);
});
