import * as T from 'three';
import { WebGLPathTracer } from 'three-gpu-pathtracer';

// A frozen, local snapshot: expand only nearby instances, never trace all ten halls.
export function createPhotoSnapshot(scene, bounds) {
  const snapshot = new T.Scene();
  const geometries = new Set(), materials = new Map();
  const region = new T.Box3(new T.Vector3(bounds.minX-1, -.5, bounds.minZ-1), new T.Vector3(bounds.maxX+1, 8, bounds.maxZ+1));
  const matrix = new T.Matrix4(), instance = new T.Matrix4(), box = new T.Box3();
  const surface = source => {
    if (materials.has(source)) return materials.get(source);
    let material;
    if (source.isMeshBasicMaterial) {
      material = new T.MeshStandardMaterial({ color: 0x000000, emissive: source.color,
        emissiveMap: source.map, emissiveIntensity: 1, side: source.side, roughness: .8 });
    } else material = source.clone();
    // Environment is supplied by actual rooflight emission in this closed interior.
    material.envMap = null;
    materials.set(source, material); return material;
  };
  const append = (source, world) => {
    const mats = Array.isArray(source.material) ? source.material : [source.material];
    if (mats.every(m => m.transparent && !m.depthWrite)) return;
    if (!source.geometry.boundingBox) source.geometry.computeBoundingBox();
    box.copy(source.geometry.boundingBox).applyMatrix4(world);
    if (!box.intersectsBox(region)) return;
    const geometry = source.geometry.clone(); geometries.add(geometry);
    const mesh = new T.Mesh(geometry, Array.isArray(source.material) ? mats.map(surface) : surface(source.material));
    mesh.matrix.copy(world); mesh.matrixAutoUpdate = false; snapshot.add(mesh);
  };
  scene.updateMatrixWorld(true);
  scene.traverseVisible(object => {
    if (!object.isMesh) return;
    if (object.isInstancedMesh) {
      for (let i=0; i<object.count; i++) { object.getMatrixAt(i,instance); matrix.multiplyMatrices(object.matrixWorld,instance); append(object,matrix); }
    } else append(object,object.matrixWorld);
  });
  for (const light of scene.children.filter(o => o.isLight && !o.isHemisphereLight)) {
    const copy = light.clone(); snapshot.add(copy);
    if (light.target) { copy.target = light.target.clone(); snapshot.add(copy.target); }
  }
  snapshot.background = new T.Color(0xf3eee3);
  snapshot.updateMatrixWorld(true);
  return { scene: snapshot, dispose() { for (const g of geometries) g.dispose(); for (const m of materials.values()) m.dispose(); } };
}

export function createPhotoRender(renderer, scene, camera, bounds, mobile) {
  const snapshot = createPhotoSnapshot(scene, bounds);
  const tracer = new WebGLPathTracer(renderer);
  const dispose = () => { tracer.dispose(); snapshot.dispose(); };
  try {
    tracer.bounces = 5;
    tracer.renderScale = mobile ? .4 : .65;
    tracer.textureSize.set(1024,1024);
    tracer.tiles.set(2,2);
    tracer.minSamples = 1; tracer.fadeDuration = 250;
    tracer.setScene(snapshot.scene,camera);
  } catch (error) { dispose(); throw error; }
  return { render() { tracer.renderSample(); return tracer.samples; }, dispose };
}
