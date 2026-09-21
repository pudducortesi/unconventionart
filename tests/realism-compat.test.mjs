import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { adaptRealismEffects, mrtAdapter } from '../tools/compat/realism-effects.mjs';
import * as T from '../vendor/three.module.js';
import { GalleryHBAOPass } from '../vendor/gallery-effects.js';

test('pinned realism-effects ESM links on current Three and MRT attachments resize correctly', async () => {
  const source = await readFile('node_modules/realism-effects/dist/index.js','utf8');
  const path = new URL('../vendor/realism-compat-test.mjs', import.meta.url);
  await writeFile(path, adaptRealismEffects(source) + mrtAdapter + '\nexport { WebGLMultipleRenderTargets };');
  try {
    const library = await import(path.href);
    assert.equal(typeof library.HBAOEffect,'function');
    assert.equal(typeof library.SSGIEffect,'function');
    const target = new library.WebGLMultipleRenderTargets(2,3,2,{depthBuffer:false});
    assert.equal(target.textures.length,2);
    assert.equal(target.texture,target.textures[0]);
    target.setSize(20,30);
    assert(target.textures.every(texture => texture.image.width===20 && texture.image.height===30));
    target.dispose();
  } finally { await unlink(path); }
});

test('HBAO bridge keeps depth attached through resizing and feeds its denoised output to composition', t => {
  t.mock.method(T.TextureLoader.prototype,'load',function(url,onLoad) {
    const texture = new T.DataTexture(new Uint8Array([128,64,192,255]),1,1);
    onLoad(texture); return texture;
  });
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(60,1,.08,200);
  const pass = new GalleryHBAOPass(scene,camera,true);
  pass.setSize(640,480);
  assert.equal(pass.effect.aoPass.renderTarget.width,320);
  assert.equal(pass.effect.aoPass.fullscreenMaterial.uniforms.depthTexture.value,pass.beauty.depthTexture);
  const draws=[], targets=[];
  pass.render({setRenderTarget: target=>targets.push(target),render:(s,c)=>draws.push([s,c])},'output');
  assert.equal(draws[0][0],scene);
  assert.equal(targets.at(-1),'output');
  assert.equal(pass.material.uniforms.aoTexture.value,pass.effect.poissionDenoisePass.texture);
  assert.equal(pass.needsFrame(),false);
  pass.dispose();
});
