import { GalleryHBAOPass } from './hbao-pass.js';
import * as T from 'three';
import { N8AOPass } from 'n8ao';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export function createRealisticRenderer(renderer, scene, camera, mobile) {
  const target = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType });
  const composer = new EffectComposer(renderer, target);
  const ao = new N8AOPass(scene, camera, 1, 1);
  ao.setQualityMode(mobile ? 'Low' : 'Medium');
  Object.assign(ao.configuration, { aoRadius: .22, distanceFalloff: .5, intensity: .65,
    halfRes: false, gammaCorrection: false, accumulate: false, transparencyAware: true });
  let hbao = null;
  const aa = new SMAAPass();
  const output = new OutputPass();
  composer.addPass(ao); composer.addPass(aa); composer.addPass(output);
  let width=0, height=0, ratio=0;
  return {
    setAdvanced(enabled) {
      if (enabled && !hbao) { hbao = new GalleryHBAOPass(scene,camera,mobile); composer.insertPass(hbao,1); }
      ao.enabled = !enabled;
      if (hbao) hbao.enabled = enabled;
    },
    needsFrame() { return !!(hbao?.enabled && hbao.needsFrame()); },
    render(delta) {
      const size = renderer.getSize(new T.Vector2());
      const dpr = renderer.getPixelRatio();
      if (size.x !== width || size.y !== height || dpr !== ratio) {
        width=size.x; height=size.y; ratio=dpr;
        composer.setPixelRatio(dpr); composer.setSize(width,height);
      }
      composer.render(delta);
    },
    dispose() {
      // N8AOPass currently inherits an empty dispose from Three's base Pass.
      const released = new Set();
      const release = item => { if (item && !released.has(item)) { released.add(item); item.dispose?.(); } };
      for (const value of Object.values(ao)) {
        if (value?.isWebGLRenderTarget || value?.isTexture || value?.isMaterial) release(value);
        if (value?.material?.isMaterial) { release(value.material); release(value); }
      }
      hbao?.dispose(); ao.dispose(); aa.dispose(); output.dispose(); composer.dispose();
    },
  };
}

export { GalleryHBAOPass };
