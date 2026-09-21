import * as T from '../../vendor/three.module.js';
import { RoomEnvironment } from '../../vendor/RoomEnvironment.js';

// The official Three.js studio environment supplies softbox reflections to PBR
// materials. It is an approximation, not a reflection of the actual gallery.
export function createEnvironment(scene, renderer) {
  const previous = scene.environment;
  const previousIntensity = scene.environmentIntensity;
  const studio = new RoomEnvironment();
  const generator = new T.PMREMGenerator(renderer);
  let target;
  try {
    target = generator.fromScene(studio, 0.04, 0.1, 100);
    scene.environment = target.texture;
    scene.environmentIntensity = 0.55;
  } finally {
    studio.dispose();
    generator.dispose();
  }
  return {
    dispose() {
      scene.environment = previous;
      scene.environmentIntensity = previousIntensity;
      target?.dispose();
    },
  };
}
