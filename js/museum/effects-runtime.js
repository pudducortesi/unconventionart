import { GalleryHBAOPass } from './hbao-pass.js';
import * as T from 'three';
import { N8AOPass } from 'n8ao';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
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
  const beauty = new RenderPass(scene, camera);
  beauty.enabled = false;
  composer.addPass(beauty);
  composer.addPass(ao); composer.addPass(aa); composer.addPass(output);
  let width=0, height=0, ratio=renderer.getPixelRatio();
  const size = new T.Vector2();
  let advanced = false, navigation = false, economical = false, quality = mobile ? "Low" : "Medium";
  const configure = () => {
    const lightweight = navigation && economical;
    beauty.enabled = lightweight;
    ao.enabled = !lightweight && !advanced;
    if (hbao) hbao.enabled = !lightweight && advanced;
    const nextQuality = navigation || mobile ? "Low" : "Medium";
    if (nextQuality !== quality) { quality = nextQuality; ao.setQualityMode(quality); }
  };
  return {
    setNavigation(active, economy) {
      if (navigation === active && economical === economy) return;
      navigation = active; economical = economy; configure();
    },
    setAdvanced(enabled) {
      if (enabled && !hbao) { hbao = new GalleryHBAOPass(scene,camera,mobile); composer.insertPass(hbao,2); }
      advanced = enabled; configure();
    },
    needsFrame() { return !!(hbao?.enabled && hbao.needsFrame()); },
    render(delta) {
      renderer.getSize(size);
      const dpr = renderer.getPixelRatio();
      if (dpr !== ratio) {
        ratio=dpr;
        // setPixelRatio already resizes every pass. Do not repeat that work.
        composer.setPixelRatio(dpr);
      }
      if (size.x !== width || size.y !== height) {
        width=size.x; height=size.y;
        composer.setSize(width,height);
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
      beauty.dispose(); hbao?.dispose(); ao.dispose(); aa.dispose(); output.dispose(); composer.dispose();
    },
  };
}

export { GalleryHBAOPass };
