import * as T from '../../vendor/three.module.js';
import { HALLS } from './layout.js';
import { MEZZANINES } from './mezzanine-layout.js';

const EPSILON = 1e-6;
const near = (a, b) => Math.abs(a - b) < EPSILON;

// Resolve the overlapping U rectangles into a single floor. The same small
// grid supplies the exposed perimeter, so shared corners never gain a rail.
function deckPlan(rectangles) {
  const xs = [...new Set(rectangles.flatMap(r => [r.minX, r.maxX]))].sort((a, b) => a - b);
  const zs = [...new Set(rectangles.flatMap(r => [r.minZ, r.maxZ]))].sort((a, b) => a - b);
  const occupied = zs.slice(0, -1).map((z, row) => xs.slice(0, -1).map((x, col) => {
    const cx = (x + xs[col + 1]) / 2, cz = (z + zs[row + 1]) / 2;
    return rectangles.some(r => cx > r.minX && cx < r.maxX && cz > r.minZ && cz < r.maxZ);
  }));
  const patches = [], edges = [];
  for (let row = 0; row < zs.length - 1; row++) {
    for (let col = 0; col < xs.length - 1; col++) {
      if (!occupied[row][col]) continue;
      const minX = xs[col], maxX = xs[col + 1], minZ = zs[row], maxZ = zs[row + 1];
      patches.push({ minX, maxX, minZ, maxZ });
      if (!occupied[row][col - 1]) edges.push({ axis: 'z', fixed: minX, start: minZ, end: maxZ });
      if (!occupied[row][col + 1]) edges.push({ axis: 'z', fixed: maxX, start: minZ, end: maxZ });
      if (!occupied[row - 1]?.[col]) edges.push({ axis: 'x', fixed: minZ, start: minX, end: maxX });
      if (!occupied[row + 1]?.[col]) edges.push({ axis: 'x', fixed: maxZ, start: minX, end: maxX });
    }
  }
  edges.sort((a, b) => a.axis.localeCompare(b.axis) || a.fixed - b.fixed || a.start - b.start);
  const perimeter = [];
  for (const edge of edges) {
    const previous = perimeter.at(-1);
    if (previous && previous.axis === edge.axis && near(previous.fixed, edge.fixed) && near(previous.end, edge.start))
      previous.end = edge.end;
    else perimeter.push({ ...edge });
  }
  return { patches, perimeter };
}

/** Wall-anchored steel galleries: one lightweight static structure per hall.
 * Only upward-facing planes are walkable; rails, slab sides and undersides
 * remain opaque raycast obstacles, not accidental upper-floor destinations. */
export function createMezzanines(room, own, box) {
  const iron = own(new T.MeshStandardMaterial({ color: 0x292e33, metalness: .65, roughness: .48 }));
  iron.name = 'mezzanine-charcoal-iron';
  const handrail = own(new T.MeshStandardMaterial({ color: 0x444c53, metalness: .7, roughness: .35 }));
  handrail.name = 'mezzanine-satin-iron';
  const deckFinish = own(new T.MeshStandardMaterial({ color: 0x565b60, metalness: .45, roughness: .72 }));
  deckFinish.name = 'mezzanine-antislip-deck';
  const plane = own(new T.PlaneGeometry(1, 1));
  const beamGeometry = own(new T.BoxGeometry(1, 1, 1));
  const walkable = [], braces = [];
  const transform = new T.Object3D();
  const up = new T.Vector3(0, 1, 0);

  const top = (x, y, z, width, depth) => {
    transform.position.set(x, y + .002, z);
    transform.rotation.set(-Math.PI / 2, 0, 0);
    transform.scale.set(width, depth, 1);
    transform.updateMatrix();
    walkable.push(transform.matrix.clone());
  };
  const strut = (a, b, width, depth = width) => {
    const start = new T.Vector3(...a), end = new T.Vector3(...b);
    const direction = end.clone().sub(start);
    transform.position.copy(start).add(end).multiplyScalar(.5);
    transform.quaternion.setFromUnitVectors(up, direction.clone().normalize());
    transform.scale.set(width, direction.length(), depth);
    transform.updateMatrix();
    braces.push(transform.matrix.clone());
  };

  for (const mezzanine of MEZZANINES) {
    const hall = HALLS[mezzanine.hallIndex];
    const { height, stair } = mezzanine;
    const { patches, perimeter } = deckPlan(mezzanine.deck);
    for (const patch of patches) {
      const width = patch.maxX - patch.minX, depth = patch.maxZ - patch.minZ;
      const x = (patch.minX + patch.maxX) / 2, z = (patch.minZ + patch.maxZ) / 2;
      box(width, .16, depth, x, height - .08, z, iron);
      top(x, height, z, width, depth);
    }

    for (const edge of perimeter) {
      const { axis, fixed, start, end } = edge;
      // Walls already enclose the outer edges. Keep full-height deck guards
      // along the stair notch: its inclined handrail sits lower than the deck
      // rail until the landing. Only the landing entry itself stays open.
      const wall = axis === 'x'
        ? Math.min(Math.abs(fixed - hall.bounds.minZ), Math.abs(fixed - hall.bounds.maxZ)) < .25
        : Math.min(Math.abs(fixed - hall.bounds.minX), Math.abs(fixed - hall.bounds.maxX)) < .25;
      const stairLanding = axis === 'x' && near(fixed, stair.minZ) && start >= stair.minX - EPSILON && end <= stair.maxX + EPSILON;
      if (wall || stairLanding) continue;
      const length = end - start, center = (start + end) / 2;
      const x = axis === 'x' ? center : fixed, z = axis === 'x' ? fixed : center;
      const run = (thickness, h, y, material) => box(axis === 'x' ? length : thickness,
        h, axis === 'z' ? length : thickness, x, y, z, material);
      run(.13, .28, height - .22, iron);
      run(.035, .085, height + .0425, iron);
      run(.06, .055, height + 1.1, handrail);
      for (const rise of [.38, .73]) run(.027, .027, height + rise, iron);
      const posts = Math.ceil(length / 1.1);
      for (let i = 0; i <= posts; i++) {
        const p = start + i / posts * length;
        box(.035, 1.1, .035, axis === 'x' ? p : fixed, height + .55, axis === 'z' ? p : fixed, iron);
      }
    }

    // Brackets cantilever from the three walls, leaving the display band and
    // the entire ground floor free of columns or diagonal eye-level supports.
    const left = hall.bounds.minX + .22, right = hall.bounds.maxX - .22;
    for (const sign of [-1, 1]) {
      const wallZ = hall.center.z + sign * 12.65, innerZ = hall.center.z + sign * 10.5;
      box(right - left, .24, .12, (left + right) / 2, height - .28, wallZ, iron);
      for (let x = left + .9; x < right; x += 2.65) {
        if (sign < 0 && x > stair.minX - .12 && x < stair.maxX + .12) continue;
        box(.085, .22, Math.abs(wallZ - innerZ), x, height - .27, (wallZ + innerZ) / 2, iron);
        strut([x, height - 1.15, wallZ], [x, height - .32, innerZ], .065);
      }
    }
    const wallX = hall.side * 26.65, innerX = hall.side * 24.5;
    box(.12, .24, 25.3, wallX, height - .28, hall.center.z, iron);
    for (let z = hall.center.z - 9; z < hall.center.z + 10; z += 3.15) {
      box(Math.abs(wallX - innerX), .22, .085, (wallX + innerX) / 2, height - .27, z, iron);
      strut([wallX, height - 1.15, z], [innerX, height - .32, z], .065);
    }

    const rise = stair.height / stair.steps, run = stair.depth / stair.steps;
    for (let step = 1; step <= stair.steps; step++) {
      const y = rise * step, z = stair.maxZ - (step - .5) * run;
      box(stair.width, .075, run, stair.x, y - .0375, z, iron);
      top(stair.x, y, z, stair.width, run);
    }
    for (const side of [-1, 1]) {
      const x = stair.x + side * stair.width / 2;
      // The inclined stringer is set inside the tread edge; rail posts are
      // outside the clear route and meet the upper deck at the exact landing.
      strut([x - side * .065, .03, stair.maxZ], [x - side * .065, height - .1, stair.minZ], .095, .2);
      for (const offset of [.38, .73, 1.1])
        strut([x, offset + rise, stair.maxZ], [x, height + offset, stair.minZ], offset === 1.1 ? .05 : .027);
      const posts = Math.ceil(stair.depth / 1.05);
      for (let i = 0; i <= posts; i++) {
        const fraction = i / posts;
        const z = stair.maxZ - fraction * stair.depth;
        const y = rise + fraction * (height - rise);
        box(.035, 1.1, .035, x, y + .55, z, iron);
      }
    }
  }

  const targets = [];
  for (const [name, geometry, material, matrices, isWalkable] of [
    ['mezzanine-walkable-tops', plane, deckFinish, walkable, true],
    ['mezzanine-steel-braces', beamGeometry, iron, braces, false],
  ]) {
    const mesh = new T.InstancedMesh(geometry, material, matrices.length);
    mesh.name = name;
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.receiveShadow = true;
    mesh.userData.mezzanine = true;
    if (isWalkable) mesh.userData.walkable = true;
    mesh.computeBoundingBox(); mesh.computeBoundingSphere();
    room.add(mesh); targets.push(mesh);
  }
  return targets;
}
