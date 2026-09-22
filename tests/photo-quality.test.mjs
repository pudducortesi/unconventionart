import test from "node:test";
import assert from "node:assert/strict";
import * as T from "../vendor/three.module.js";
import { createArtwork } from "../js/museum/architecture.js";

const slot = {
  x: 0,
  z: 0,
  rotation: 0,
  work: { id: "photo", title: "Photo", image: "original.jpg" },
};
const renderer = {
  capabilities: { maxTextureSize: 4096, getMaxAnisotropy: () => 8 },
};
const context = { scale() {}, fillRect() {}, fillText() {}, drawImage() {} };

test("mobile wall preview upgrades to original pixels and releases detail on departure", async (t) => {
  const oldDocument = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ ...context }),
    }),
  };
  t.after(() => {
    globalThis.document = oldDocument;
  });
  const textures = [];
  t.mock.method(T.TextureLoader.prototype, "loadAsync", async () => {
    const texture = new T.Texture({ width: 1365, height: 2048 });
    textures.push(texture);
    return texture;
  });
  const art = await createArtwork(slot, renderer, { mobile: true });
  const preview = art.photograph.material.map;
  assert.equal(preview.image.height, 1024);
  await art.setDetail(true);
  const full = art.photograph.material.map;
  assert.equal(full.image.width, 1365);
  assert.equal(full.image.height, 2048);
  assert.equal(full.anisotropy, 8);
  assert.equal(art.photograph.material.toneMapped, false);
  let released = false;
  full.addEventListener("dispose", () => {
    released = true;
  });
  await art.setDetail(false);
  assert.equal(art.photograph.material.map, preview);
  assert(released);
  assert.equal(textures.length, 2);
  art.dispose();
});

test("a late detail download is disposed when the artwork has left the scene", async (t) => {
  const oldDocument = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ ...context }),
    }),
  };
  t.after(() => {
    globalThis.document = oldDocument;
  });
  let resolveDetail,
    calls = 0;
  t.mock.method(T.TextureLoader.prototype, "loadAsync", () => {
    if (++calls === 1)
      return Promise.resolve(new T.Texture({ width: 1365, height: 2048 }));
    return new Promise((resolve) => {
      resolveDetail = resolve;
    });
  });
  const art = await createArtwork(slot, renderer, { mobile: true });
  const request = art.setDetail(true);
  assert.equal(art.setDetail(true), request, "share in-flight request");
  await Promise.resolve(); // Resolve the cached source before the delayed texture request.
  art.dispose();
  const texture = new T.Texture({ width: 1365, height: 2048 });
  let released = false;
  texture.addEventListener("dispose", () => {
    released = true;
  });
  resolveDetail(texture);
  await request;
  assert(released);
});

test("navigation uses the appropriate derivative and HD keeps the original", async (t) => {
  const oldDocument=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>({...context})})};
  t.after(()=>{globalThis.document=oldDocument;});
  const requests=[];
  t.mock.method(T.TextureLoader.prototype,'loadAsync',async source=>{requests.push(source);return new T.Texture({width:683,height:1024});});
  const optimized={...slot,work:{...slot.work,thumbnail:'thumb.webp',mobilePreview:'mobile.webp',preview:'desktop.webp'}};
  const mobile=await createArtwork(optimized,renderer,{mobile:true});
  const desktop=await createArtwork(optimized,renderer);
  await desktop.setDetail(true);
  assert.deepEqual(requests,['mobile.webp','desktop.webp','original.jpg']);
  mobile.dispose();desktop.dispose();
});

test("a missing derivative falls back to the original without losing the artwork", async (t) => {
  const oldDocument=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>({...context})})};
  t.after(()=>{globalThis.document=oldDocument;});
  const requests=[];
  t.mock.method(T.TextureLoader.prototype,'loadAsync',async source=>{requests.push(source);if(source==='missing.webp')throw Error('404');return new T.Texture({width:683,height:1024});});
  const art=await createArtwork({...slot,work:{...slot.work,preview:'missing.webp'}},renderer);
  assert.deepEqual(requests,['missing.webp','original.jpg']);art.dispose();
});
