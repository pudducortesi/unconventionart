import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
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
    const architecture = createArchitecture(scene, { shadowMap: {} }, { mobile });
    assert(architecture.floor.userData.walkable);
    assert(architecture.occluders.length > 10);
    const room = scene.getObjectByName('white-museum-200');
    assert(room);
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
