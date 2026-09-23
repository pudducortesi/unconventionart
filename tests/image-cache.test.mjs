import test from 'node:test';
import assert from 'node:assert/strict';
import {createImageCache} from '../js/museum/image-cache.js';
const photo = () => new Response(new Blob(['jpeg'],{type:'image/jpeg'}));
test('wall and detail share one compressed preview request throughout a visit', async () => {
  let calls=0;
  const image=createImageCache({fetchImage:async()=>{calls++;return photo();},makeURL:()=> 'blob:preview'});
  assert.deepEqual(await Promise.all([image('photo'),image('photo')]),['blob:preview','blob:preview']);
  assert.equal(await image('photo'),'blob:preview');
  assert.equal(calls,1);
});
test('transient failures retry and failed entries do not poison later openings',async()=>{
  let calls=0;
  const image=createImageCache({fetchImage:async()=>{calls++;return calls<=3?new Response('',{status:503}):photo();},makeURL:()=> 'blob:retry'});
  await assert.rejects(image('photo'));
  assert.equal(calls,3);
  assert.equal(await image('photo'),'blob:retry');
});
test('a withdrawn photograph is not retried or cached as an image',async()=>{
  let calls=0;
  const image=createImageCache({fetchImage:async()=>{calls++;return new Response('',{status:404});},makeURL:()=>assert.fail()});
  await assert.rejects(image('removed'));
  assert.equal(calls,1);
});
