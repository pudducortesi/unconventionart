import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import { INITIAL, INITIAL_TARGET, HALLS } from '../js/museum/layout.js';
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
    const localLights = scene.children.filter(object => object.name === 'local-pendant-light');
    assert.equal(localLights.length, 3, 'Reuse a bounded light pool across all ten rooms');
    architecture.updateLighting(INITIAL);
    assert.equal(localLights.filter(light => light.intensity > 0).length, 3);
    architecture.updateLighting({x: 0, z: -39});
    assert(localLights.every(light => light.intensity === 0), 'Pendant light must not follow the visitor into the corridor');
    assert(architecture.floor.userData.walkable);
    assert(architecture.occluders.length > 10);
    const room = scene.getObjectByName('white-museum-200');
    assert(room);
    scene.updateMatrixWorld(true);
    for (const hall of HALLS) {
      const floorRay = new T.Raycaster(
        new T.Vector3(hall.center.x + 9, 1, hall.center.z + 10),
        new T.Vector3(0, -1, 0), 0, 2);
      const hit = floorRay.intersectObjects(architecture.occluders, true)[0];
      assert(hit?.object.userData.walkable, 'Finished floors must preserve tap-to-walk');
      assert(hit.object.name.startsWith(hall.id + '-'), 'Room finish must cover the structural slab');
    }
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
