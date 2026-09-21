import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import { INITIAL, INITIAL_TARGET } from '../js/museum/layout.js';
import { createArchitecture } from '../js/museum/architecture.js';

for (const mobile of [false, true]) {
  test(`complete gallery constructs and disposes (${mobile ? 'mobile' : 'desktop'})`, (t) => {
    const previous = globalThis.document;
    globalThis.document = {
      createElement: () => ({ width: 0, height: 0, getContext: () => ({
        fillRect() {}, fillText() {},
        createRadialGradient: () => ({ addColorStop() {} }),
      }) }),
    };
    t.after(() => { globalThis.document = previous; });
    t.mock.method(T.TextureLoader.prototype, 'load', () => new T.Texture());
    const scene = new T.Scene();
    const renderer = { shadowMap: {} };
    const architecture = createArchitecture(scene, renderer, { mobile });
    assert.equal(renderer.shadowMap.enabled, true);
    assert.equal(renderer.shadowMap.autoUpdate, false);
    architecture.updateLighting(INITIAL);
    assert.equal(renderer.shadowMap.needsUpdate, true);
    renderer.shadowMap.needsUpdate = false;
    architecture.updateLighting(INITIAL);
    assert.equal(renderer.shadowMap.needsUpdate, false, "Static room lighting should reuse its shadow map");
    architecture.updateLighting({ x: 16, z: -39 });
    assert.equal(renderer.shadowMap.needsUpdate, true, "Changing rooms must refresh furniture shadows");
    assert(architecture.floor.userData.walkable);
    assert(architecture.occluders.length > 10);
    const room = scene.getObjectByName('white-museum-200');
    assert(room);
    scene.updateMatrixWorld(true);
    const eye = new T.Vector3(INITIAL.x, INITIAL.y, INITIAL.z);
    const target = new T.Vector3(INITIAL_TARGET.x, INITIAL_TARGET.y, INITIAL_TARGET.z);
    const distance = eye.distanceTo(target);
    const ray = new T.Raycaster(eye, target.clone().sub(eye).normalize(), 0, distance - 0.1);
    assert.equal(ray.intersectObjects(architecture.occluders, true).length, 0,
      'The first artwork must be visible from arrival without furniture or screen occlusion');
    let instances = 0;
    room.traverse(object => {
      if (!object.isInstancedMesh) return;
      instances += object.count;
      for (const value of object.instanceMatrix.array) assert(Number.isFinite(value));
    });
    assert(instances > 100);
    architecture.dispose();
    assert.equal(scene.children.length, 0);
  });
}
