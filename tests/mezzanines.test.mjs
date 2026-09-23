import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import { HALLS, HANGING_CENTER } from '../js/museum/layout.js';
import { MEZZANINES } from '../js/museum/mezzanine-layout.js';
import { createMezzanines } from '../js/museum/mezzanines.js';

function fixture(t) {
  const room = new T.Group(), resources = new Set(), batches = new Map();
  const own = resource => (resources.add(resource), resource);
  const cube = own(new T.BoxGeometry(1, 1, 1));
  const transform = new T.Object3D();
  const box = (w, h, d, x, y, z, material) => {
    if (!batches.has(material)) batches.set(material, []);
    transform.position.set(x, y, z); transform.scale.set(w, h, d); transform.updateMatrix();
    batches.get(material).push(transform.matrix.clone());
  };
  const targets = createMezzanines(room, own, box);
  for (const [material, matrices] of batches) {
    const mesh = new T.InstancedMesh(cube, material, matrices.length);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.computeBoundingSphere();
    room.add(mesh); targets.push(mesh);
  }
  room.updateMatrixWorld(true);
  t.after(() => {
    room.traverse(mesh => { if (mesh.isInstancedMesh) mesh.dispose(); });
    for (const resource of resources) resource.dispose();
  });
  const ray = (origin, direction, far) => new T.Raycaster(
    new T.Vector3(...origin), new T.Vector3(...direction), 0, far,
  ).intersectObjects(targets, false);
  return { room, resources, ray };
}

test('ten iron mezzanines share compact, texture-free static batches', t => {
  const { room, resources } = fixture(t);
  assert.equal(MEZZANINES.length, 10);
  assert.equal(room.children.length, 4, 'Two structural materials plus deck tops and diagonal ironwork');
  assert.equal([...resources].filter(resource => resource.isMaterial).length, 3);
  assert.equal([...resources].filter(resource => resource.isTexture).length, 0);
  for (const mesh of room.children) {
    assert(mesh.isInstancedMesh);
    assert(mesh.count < 2000, 'Repeated details stay within a small static geometry budget');
    for (const value of mesh.instanceMatrix.array) assert(Number.isFinite(value));
  }
});

test('U decks are continuous, keep the room center open, and expose only upward walkable faces', t => {
  const { ray } = fixture(t);
  for (const hall of HALLS) {
    const mezzanine = MEZZANINES[hall.index];
    const x = hall.side * 25.6, z = hall.center.z;
    const upper = ray([x, 8, z], [0, -1, 0], 3)[0];
    assert(upper?.object.userData.walkable && upper.object.userData.mezzanine);
    assert(Math.abs(upper.point.y - mezzanine.height - .002) < 1e-5);
    const underside = ray([x, 5.5, z], [0, 1, 0], 1)[0];
    assert(underside && !underside.object.userData.walkable, 'Undersides cannot be mistaken for deck destinations');
    assert.equal(ray([hall.center.x, 8, z], [0, -1, 0], 3).length, 0);
    for (const sign of [-1, 1]) {
      const hits = ray([x, 8, z + sign * 11.9], [0, -1, 0], 3);
      assert(hits[0]?.object.userData.walkable, 'The U corners are connected');
      assert.equal(hits.filter(hit => hit.object.userData.walkable).length, 1,
        'Overlapping layout rectangles never produce duplicate coplanar floors');
    }
  }
});

test('all 360 stair treads and ten landings stay aligned with the navigation layout', t => {
  const { ray } = fixture(t);
  for (const { stair, height } of MEZZANINES) {
    const rise = height / stair.steps, run = stair.depth / stair.steps;
    for (let i = 1; i <= stair.steps; i++) {
      const z = stair.maxZ - (i - .5) * run;
      const hit = ray([stair.x, height + 2, z], [0, -1, 0], height + 3)[0];
      assert(hit?.object.userData.walkable, `Tread ${i} stays directly selectable from above`);
      assert(Math.abs(hit.point.y - i * rise - .002) < 1e-5);
    }
    assert.equal(ray([stair.x, height + .6, stair.minZ + .5], [0, 0, -1], 1.6).length, 0,
      'No crossbar blocks passage from the stair onto the upper landing');
    for (const x of [stair.minX, stair.maxX]) {
      for (const offset of [.1, .4, .75]) {
        const guard = ray([x, height + 2, stair.minZ + offset], [0, -1, 0], 1.2)[0];
        assert(guard && guard.point.y >= height + 1.09,
          'Full-height horizontal guards join the deck rail along both stair-notch flanks');
        assert(!guard.object.userData.walkable);
      }
    }
    assert.equal(ray([stair.x, 1.7, stair.maxZ + .3], [0, 0, -1], .6).length, 0,
      'The ground-floor stair entry has no rail across it');
  }
});

test('wall cantilevers leave every ground-floor artwork sightline clear', t => {
  const { ray } = fixture(t);
  for (const hall of HALLS) {
    for (const slot of hall.slots) {
      const nx = Math.sin(slot.rotation), nz = Math.cos(slot.rotation);
      const origin = [slot.x + nx * 4, HANGING_CENTER, slot.z + nz * 4];
      assert.equal(ray(origin, [-nx, 0, -nz], 3.9).length, 0,
        `Mezzanine supports do not cross the exhibition band in ${hall.id}`);
    }
  }
});
