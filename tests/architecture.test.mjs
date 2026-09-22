import { ROOM_FINISHES } from '../js/museum/room-finishes.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import { INITIAL, INITIAL_TARGET, HALLS, FURNITURE, BUILDING } from '../js/museum/layout.js';
import { createArchitecture } from '../js/museum/architecture.js';
import { MEZZANINES, MEZZANINE_HEIGHT } from '../js/museum/mezzanine-layout.js';

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
    renderer.shadowMap.needsUpdate = false;
    architecture.updateLighting({ ...INITIAL, floorY: MEZZANINE_HEIGHT });
    assert.equal(renderer.shadowMap.needsUpdate, true, 'Changing floor refreshes the local light and shadows');
    const daylight = scene.children.find(object => object.isDirectionalLight);
    assert(daylight.position.y > MEZZANINE_HEIGHT + 1.7, 'Upper walkways are lit from above the visitor');
    architecture.updateLighting({x: 0, z: -39});
    assert(localLights.every(light => light.intensity === 0), 'Pendant light must not follow the visitor into the corridor');
    assert(architecture.floor.userData.walkable);
    assert(architecture.occluders.length > 10);
    const room = scene.getObjectByName('white-museum-200');
    assert(room);
    const bakedTextures = new Set(), woodTextures = new Set();
    scene.updateMatrixWorld(true);
    for (const hall of HALLS) {
      const floorRay = new T.Raycaster(
        new T.Vector3(hall.center.x + 9, 1, hall.center.z + 10),
        new T.Vector3(0, -1, 0), 0, 2);
      const hit = floorRay.intersectObjects(architecture.occluders, true)[0];
      assert(hit?.object.userData.walkable, 'Finished floors must preserve tap-to-walk');
      assert(hit.object.name.startsWith(hall.id + '-'), 'Room finish must cover the structural slab');
      assert.equal(hit.object.material.color.getHex(), 0xffffff, 'Wood colour comes from the shared mosaic parquet texture');
      assert(hit.object.material.map?.image.data, 'All rooms have parquet rather than a flat fill');
      const surface = hit.object.material, geometry = hit.object.geometry;
      assert.equal(surface.map.colorSpace, T.SRGBColorSpace);
      assert.equal(surface.normalMap.colorSpace, T.NoColorSpace);
      assert.equal(surface.roughnessMap.colorSpace, T.NoColorSpace);
      assert.equal(surface.lightMap.colorSpace, T.LinearSRGBColorSpace);
      assert.equal(surface.aoMap.colorSpace, T.NoColorSpace);
      assert.equal(surface.lightMap.channel, 1);
      assert.equal(surface.aoMap.channel, 1);
      assert(geometry.attributes.uv.getX(1) > 1, 'Wood tiles at physical scale');
      assert.equal(geometry.attributes.uv1.getX(1), 1, 'Baked light covers the room once');
      for (const texture of [surface.map, surface.normalMap, surface.roughnessMap]) woodTextures.add(texture);
      bakedTextures.add(surface.lightMap); bakedTextures.add(surface.aoMap);
      assert.equal(ROOM_FINISHES[hall.index].wall, 0xffffff, 'Exhibition walls are white');
      assert.equal(ROOM_FINISHES[hall.index].accent, 0xffffff, 'Entrance walls are white');
      const mezzanine = MEZZANINES[hall.index];
      const upperRay = new T.Raycaster(new T.Vector3(hall.side * 25.6, 8, hall.center.z),
        new T.Vector3(0, -1, 0), 0, 3);
      const upperHit = upperRay.intersectObjects(architecture.occluders, true)[0];
      assert(upperHit?.object.userData.walkable && upperHit.object.userData.mezzanine,
        'Every upper deck supports tap-to-walk after spatial batching');
      assert(Math.abs(upperHit.point.y - mezzanine.height) < .015);
      const centerRay = new T.Raycaster(new T.Vector3(hall.center.x, 8, hall.center.z),
        new T.Vector3(0, -1, 0), 0, 3);
      assert.equal(centerRay.intersectObjects(architecture.occluders, true).length, 0,
        'The horseshoe leaves the central double-height void open');
      const ceilingRay = new T.Raycaster(new T.Vector3(hall.center.x + 9, 8, hall.center.z + 10),
        new T.Vector3(0, 1, 0), 0, BUILDING.height);
      const ceilingHit = ceilingRay.intersectObjects(architecture.occluders, true)[0];
      assert(ceilingHit?.point.y > 12 && ceilingHit.point.y <= BUILDING.height,
        'Every hall ceiling rises to the new double-height envelope');
      const lintelRay = new T.Raycaster(new T.Vector3(0, 8, hall.center.z),
        new T.Vector3(hall.side, 0, 0), 0, 5.6);
      assert(lintelRay.intersectObjects(architecture.occluders, true).length > 0,
        'Raising the roof must not leave an open gap over the original doorway');
    }
    for (const x of [0, -4.2, 4.2]) {
      for (const z of [-13, -39, -65, -91, -117]) {
        const down = new T.Raycaster(new T.Vector3(x, 1.7, z), new T.Vector3(0,-1,0), 0, 2);
        assert(down.intersectObjects(architecture.occluders, false)[0]?.object.userData.walkable,
          'Corridor ribbon and coloured thresholds must preserve tap-to-walk');
      }
    }
    for (const hall of HALLS) {
      for (const offset of [-2.1, 0, 2.1]) {
        const throughDoor = new T.Raycaster(new T.Vector3(0, 1.7, hall.center.z + offset),
          new T.Vector3(hall.side, 0, 0), 0, 5.6);
        assert.equal(throughDoor.intersectObjects(architecture.occluders, true).length, 0,
          'Portal surrounds and signs must not narrow the usable doorway');
      }
    }
    for (const x of [-3.8, 0, 3.8]) {
      const alongCorridor = new T.Raycaster(new T.Vector3(x, 1.7, 7), new T.Vector3(0, 0, -1), 0, 135);
      assert.equal(alongCorridor.intersectObjects(architecture.occluders, true).length, 0,
        'The central promenade stays clear for the full length');
    }
    for (const bench of FURNITURE.filter(piece => piece.kind === 'corridor-bench')) {
      const down = new T.Raycaster(new T.Vector3(bench.x, 1.7, bench.z), new T.Vector3(0, -1, 0), 0, 2);
      const hit = down.intersectObjects(architecture.occluders, true)[0];
      assert(hit && !hit.object.userData.walkable, 'A bench must block floor-click navigation');
      assert(Math.abs(hit.point.y - bench.height) < 1e-5, 'Rendered seating matches the collision/bake dimensions');
    }
    const signs = room.children.filter(object => object.name.startsWith('corridor-room-'));
    assert.equal(signs.length, 20, 'Each doorway retains identification on both sides');
    for (const sign of signs) {
      const normal = new T.Vector3(0, 0, 1).applyQuaternion(sign.quaternion);
      assert(normal.x * HALLS[sign.userData.hallIndex].side < 0,
        'Room plaques face the visitor in the corridor');
      const readSign = new T.Raycaster(sign.position.clone().add(normal), normal.negate(), 0, 1.1);
      assert.equal(readSign.intersectObjects(architecture.occluders, true)[0]?.object, sign,
        'The sign face must be visible in front of the wall');
    }
    const roofHeights = [0, 3.8].map(x => {
      const ray = new T.Raycaster(new T.Vector3(x, 1.7, -13), new T.Vector3(0, 1, 0), 0, BUILDING.height);
      const hit = ray.intersectObjects(architecture.occluders, true)[0];
      assert.equal(hit?.object.name, 'corridor-barrel-vault');
      return hit.point.y;
    });
    assert.equal(BUILDING.height, 13.2);
    assert(Math.abs(roofHeights[0] - 12.9) < .01);
    assert(roofHeights[0] > roofHeights[1] + 1 && roofHeights[0] < BUILDING.height,
      'The vault is genuinely curved and fits below the existing roof');
    const stoneFloor = scene.getObjectByName('promenade-stone-floor');
    assert(stoneFloor?.material.isMeshPhysicalMaterial);
    assert(stoneFloor.material.roughness < .3 && stoneFloor.material.clearcoat > .5);
    assert.equal(room.children.filter(object => object.name === 'corridor-classical-arch').length, 10);
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
    assert.equal(woodTextures.size, 3, 'All halls share one set of parquet maps');
    assert.equal(bakedTextures.size, 20, 'Each room has independent light and occlusion');
    let released = 0;
    for (const texture of [...woodTextures, ...bakedTextures]) texture.addEventListener('dispose', () => released++);
    architecture.dispose();
    assert.equal(released, woodTextures.size + bakedTextures.size, 'Release all new GPU textures on exit');
    assert.equal(scene.children.length, 0);
  });
}
