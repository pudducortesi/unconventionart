import * as T from '../../vendor/three.module.js';

// Museum-wide batches defeat frustum rejection: one chair in view submits all
// chairs sharing its material. Partition instances into compact spatial cells.
export function partitionInstances(root, raycastTargets, cellSize = 26) {
  const originals = [];
  root.traverse(object => { if (object.isInstancedMesh && object.count > 1) originals.push(object); });
  const matrix = new T.Matrix4();
  for (const original of originals) {
    const cells = new Map();
    for (let i = 0; i < original.count; i++) {
      original.getMatrixAt(i, matrix);
      const e = matrix.elements;
      const key = `${Math.floor(e[12] / cellSize)}/${Math.floor(e[14] / cellSize)}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(i);
    }
    if (cells.size < 2 || original.instanceColor || original.morphTexture) continue;
    const replacements = [];
    for (const indices of cells.values()) {
      const mesh = new T.InstancedMesh(original.geometry, original.material, indices.length);
      mesh.name = original.name;
      mesh.position.copy(original.position); mesh.quaternion.copy(original.quaternion); mesh.scale.copy(original.scale);
      mesh.castShadow = original.castShadow; mesh.receiveShadow = original.receiveShadow;
      mesh.userData = { ...original.userData };
      mesh.renderOrder = original.renderOrder;
      mesh.layers.mask = original.layers.mask;
      indices.forEach((source, destination) => {
        original.getMatrixAt(source, matrix); mesh.setMatrixAt(destination, matrix);
      });
      mesh.computeBoundingBox(); mesh.computeBoundingSphere();
      original.parent.add(mesh); replacements.push(mesh);
    }
    const index = raycastTargets.indexOf(original);
    if (index >= 0) raycastTargets.splice(index, 1, ...replacements);
    original.removeFromParent(); original.dispose();
  }
}
