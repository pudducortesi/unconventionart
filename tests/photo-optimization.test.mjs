import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { readFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { optimizePhotos, psnr } from '../tools/optimize-photos.mjs';

test('photo pipeline preserves source and catalogue, creates smaller bounded derivatives with quality checks',async t=>{
 const root=await mkdtemp(join(tmpdir(),'ua-photos-input-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const sourceDir=join(root,'images');await (await import('node:fs/promises')).mkdir(sourceDir,{recursive:true});
 const sourcePath=join(sourceDir,'sample.jpg');await sharp({create:{width:600,height:800,channels:3,background:'#8b6f54'}}).jpeg({quality:100}).toFile(sourcePath);
 const output=join(root,'dist');
 const catalogue={hero:'images/sample.jpg',collections:[],works:[{id:'sample',title:'Sample',image:'images/sample.jpg'}]},before=structuredClone(catalogue);
 const original=await readFile(sourcePath),result=await optimizePhotos(catalogue,{root,output});
 assert.deepEqual(catalogue,before);assert.deepEqual(await readFile(sourcePath),original);
 assert.equal(result.catalogue.works[0].image,result.catalogue.works[0].preview);
 assert.notEqual(result.catalogue.works[0].image,before.works[0].image);
 for(const variant of result.report[0].variants){
  assert.ok(variant.bytes<original.length);assert.ok(variant.psnr>=42 || variant.psnr==='lossless');
  const data=await readFile(join(output,variant.path));const meta=await sharp(data).metadata();
  assert.equal(meta.width,variant.width);assert.equal(meta.height,variant.height);assert.ok(!meta.exif);
 }
 assert.ok(result.report[0].variants[1].height<=1024);
 assert.ok(result.report[0].variants[2].height<=1536);
});

test('production exposes only previews, never master paths or bytes',async()=>{
 const source=JSON.parse(await readFile('data/catalogue.json','utf8'));
 const published=JSON.parse(await readFile('dist/data/catalogue.json','utf8'));
 for(const [i,work] of published.works.entries()){
  assert.equal(work.image,work.preview);
  for(const path of [work.thumbnail,work.mobilePreview,work.preview])await stat(join('dist',path));
  await assert.rejects(stat(join('dist',source.works[i].image)),{code:'ENOENT'});
  const preview=await sharp(await readFile(join('dist',work.image))).metadata();
  assert(Math.max(preview.width,preview.height)<=1536);
 }
 const meta=JSON.parse(await readFile('build-meta.json','utf8'));
 assert.ok(Object.keys(meta.inputs).every(path=>!path.startsWith('research/')&&!path.includes('node_modules/sharp/')));
 const publishing=JSON.parse(await readFile('data/publishing.json','utf8'));
 if(publishing.enabled && publishing.liveCatalogue !== false) {
  assert.equal(published.works.length,0);
  await assert.rejects(stat('dist/models'),{code:'ENOENT'});
  await assert.rejects(stat('dist/images/optimized'),{code:'ENOENT'}); } else {
  assert.equal(published.works.length,0);
  await assert.rejects(stat('dist/models'),{code:'ENOENT'});
 }
 const html=await readFile('dist/index.html','utf8');
 assert(!html.includes('artwork-original'));
 assert(!html.includes(source.works[0].image));
});

test('private/traversing paths are rejected and PSNR compares matching buffers',async t=>{
 const output=await mkdtemp(join(tmpdir(),'ua-photos-'));t.after(()=>rm(output,{recursive:true,force:true}));
 for(const image of ['images/private/a.jpg','images/../secret.jpg'])await assert.rejects(optimizePhotos({works:[{image}]},{output}));
 assert.equal(psnr(Buffer.from([1,2]),Buffer.from([1,2])),Infinity);
 assert.throws(()=>psnr(Buffer.from([1]),Buffer.from([1,2])));
});
