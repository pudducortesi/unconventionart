import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {optimizeAvatar} from '../tools/optimize-avatar.mjs';
// Meshopt may cyclically rotate triangle indices, preserving vertex order/winding.
function triangles(array){const result=[];for(let i=0;i<array.length;i+=3){const tri=Array.from(array.slice(i,i+3));const min=tri.indexOf(Math.min(...tri));result.push(...tri.slice(min),...tri.slice(0,min));}return result;}
function sameArray(actual,expected,label){assert.equal(actual.length,expected.length,label+' length');assert(actual.every((v,i)=>v===expected[i]),label+' values');}
test('avatar compression preserves geometry, morph targets and the authored rig',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'ua-avatar-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const path=join(dir,'avatar.glb'),report=await optimizeAvatar('avatars/atelier-v1.glb',path);assert(report.outputBytes<report.inputBytes);
 await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
 const a=(await io.read('avatars/atelier-v1.glb')).getRoot(),b=(await io.read(path)).getRoot();
 assert.deepEqual(b.listNodes().map(n=>[n.getName(),n.getMatrix()]),a.listNodes().map(n=>[n.getName(),n.getMatrix()]));
 assert.equal(b.listMeshes().length,a.listMeshes().length);
 a.listMeshes().forEach((mesh,i)=>{const output=b.listMeshes()[i];assert.deepEqual(output.getWeights(),mesh.getWeights());assert.equal(output.listPrimitives().length,mesh.listPrimitives().length);
  mesh.listPrimitives().forEach((primitive,j)=>{const other=output.listPrimitives()[j];assert.equal(other.getMode(),primitive.getMode());sameArray(triangles(other.getIndices().getArray()),triangles(primitive.getIndices().getArray()),'triangle indices');
   for(const semantic of primitive.listSemantics())sameArray(other.getAttribute(semantic).getArray(),primitive.getAttribute(semantic).getArray(),semantic);
   assert.equal(other.listTargets().length,primitive.listTargets().length);
   primitive.listTargets().forEach((target,k)=>{for(const semantic of target.listSemantics())sameArray(other.listTargets()[k].getAttribute(semantic).getArray(),target.getAttribute(semantic).getArray(),'morph '+semantic);});
  });
 });
 assert.equal(b.listSkins().length,a.listSkins().length);
 a.listSkins().forEach((skin,i)=>{assert.deepEqual(b.listSkins()[i].listJoints().map(n=>n.getName()),skin.listJoints().map(n=>n.getName()));sameArray(b.listSkins()[i].getInverseBindMatrices().getArray(),skin.getInverseBindMatrices().getArray(),'bind matrices');});
 assert.equal(b.listTextures().length,a.listTextures().length);
 a.listTextures().forEach((texture,i)=>sameArray(b.listTextures()[i].getImage(),texture.getImage(),'texture'));
});
