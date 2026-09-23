import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import { partitionInstances } from '../js/museum/spatial-batches.js';

test('partition preserves all instances and shares geometry while rejecting distant cells', () => {
  const root = new T.Group();
  const geometry = new T.BoxGeometry();
  const material = new T.MeshBasicMaterial();
  const original = new T.InstancedMesh(geometry, material, 10);
  original.castShadow = true;
  for (let i=0;i<10;i++) original.setMatrixAt(i,new T.Matrix4().makeTranslation(0,0,-5-i*26));
  root.add(original); const targets=[original];
  partitionInstances(root,targets); root.updateMatrixWorld(true);
  assert.equal(targets.length,10);
  assert.equal(targets.reduce((n,m)=>n+m.count,0),10);
  assert.ok(targets.every(m=>m.geometry===geometry && m.material===material && m.castShadow));
  const camera = new T.PerspectiveCamera(60,1,.1,40);
  camera.updateMatrixWorld();
  const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  assert.equal(targets.filter(m=>frustum.intersectsObject(m)).length,2);
  const ray = new T.Raycaster(new T.Vector3(),new T.Vector3(0,0,-1));
  assert.equal(ray.intersectObjects(targets,false)[0].distance,4.5);
  assert.ok(!root.children.includes(original));
  targets.forEach(m=>m.dispose()); geometry.dispose(); material.dispose();
});
