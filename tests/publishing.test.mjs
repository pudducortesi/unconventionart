import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePublishingConfig, validateUpload, publicationPatch} from '../js/publishing.js';
import {createPublicGallery} from '../supabase/functions/gallery-public/handler.js';
import {layoutWorks} from '../js/museum/navigation.js';
const id='10000000-0000-4000-8000-000000000001', url='https://project.supabase.co';
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
test('public application key is checked before database access and added to preview URLs',async()=>{
  let calls=0;
  const handler=createPublicGallery({url,serviceKey:'secret',publicKey:'sb_publishable_test',fetchImpl:async()=>{calls++;return json([{id,title:'Opera',hall_index:0,wall_slot:0,updated_at:'now'}]);}});
  const endpoint=`${url}/functions/v1/gallery-public/catalogue`;
  assert.equal((await handler(new Request(endpoint))).status,401);
  assert.equal((await handler(new Request(endpoint,{headers:{apikey:'wrong'}}))).status,401);
  assert.equal(calls,0);
  const response=await handler(new Request(endpoint,{headers:{apikey:'sb_publishable_test'}}));
  assert.equal(response.status,200);
  assert.equal(new URL((await response.json()).works[0].image).searchParams.get('apikey'),'sb_publishable_test');
  assert.equal((await handler(new Request(endpoint+'?apikey=sb_publishable_test'))).status,200);
});
test('publishing config accepts public keys only, validates endpoint and fails closed',()=>{
  assert.equal(validatePublishingConfig({enabled:false}).enabled,false);
  const config={enabled:true,supabaseUrl:url,publishableKey:'sb_publishable_test',catalogueUrl:`${url}/functions/v1/gallery-public/catalogue`};
  assert.equal(validatePublishingConfig(config).supabaseUrl,url);
  assert.throws(()=>validatePublishingConfig({...config,publishableKey:'sb_secret_private'}));
  assert.throws(()=>validatePublishingConfig({...config,catalogueUrl:'https://elsewhere.test'}));
});
test('uploads and room metadata reject unsupported images and invalid locations',()=>{
  assert.throws(()=>validateUpload({type:'image/svg+xml',size:100}));
  assert.throws(()=>validateUpload({type:'image/jpeg',size:45*1024*1024}));
  validateUpload({type:'image/jpeg',size:100});
  assert.equal(publicationPatch('Opera','Descrizione','',false).hall_index,null);
  assert.throws(()=>publicationPatch('Opera','','10',true));
  assert.throws(()=>publicationPatch('','','0',true));
});
test('public catalogue never returns private storage paths and represents an empty exhibition',async()=>{
  const handler=createPublicGallery({url,serviceKey:'secret',fetchImpl:async endpoint=>{
    assert(endpoint.includes('published=eq.true'));return json([{id,title:'Opera',description:'',credit:'UA',hall_index:4,wall_slot:7,updated_at:'now'}]);
  }});
  const response=await handler(new Request(`${url}/functions/v1/gallery-public/catalogue`));
  const data=await response.json(); assert.equal(data.works[0].hallIndex,4);assert(!JSON.stringify(data).includes('original'));
  const empty=createPublicGallery({url,serviceKey:'secret',fetchImpl:async()=>json([])});
  assert.deepEqual((await (await empty(new Request(`${url}/functions/v1/gallery-public/catalogue`))).json()).works,[]);
});
test('withdrawn images, arbitrary paths and write attempts cannot expose storage',async()=>{
  let calls=0; const handler=createPublicGallery({url,serviceKey:'secret',fetchImpl:async()=>{calls++;return json([]);}});
  assert.equal((await handler(new Request(`${url}/functions/v1/gallery-public/image/${id}`))).status,404);
  assert.equal(calls,1);
  for(const path of ['original/'+id,'image/not-a-uuid','image/'+id+'/original.jpg'])
    assert.equal((await handler(new Request(`${url}/functions/v1/gallery-public/${path}`))).status,404);
  assert.equal((await handler(new Request(`${url}/functions/v1/gallery-public/catalogue`,{method:'POST'}))).status,405);
  assert.equal(calls,1);
});
test('image endpoint serves only published JPEG previews without caching',async()=>{
  let calls=0;
  const handler=createPublicGallery({url,serviceKey:'secret',fetchImpl:async(endpoint)=>{
    calls++;
    if(calls===1)return json([{id,preview_path:`${id}/preview.jpg`}]);
    assert(endpoint.includes('/gallery-previews/'));assert(!endpoint.includes('original'));
    return new Response(new Uint8Array([255,216,255,217]));
  }});
  const response=await handler(new Request(`${url}/functions/v1/gallery-public/image/${id}`));
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  const broken=createPublicGallery({url,serviceKey:'secret',fetchImpl:async()=>new Response('',{status:500})});
  assert.equal((await broken(new Request(`${url}/functions/v1/gallery-public/catalogue`))).status,503);
});
test('curated wall positions survive removals from the catalogue',()=>{
  const works=[{id:'a',hallIndex:0,wallSlot:4},{id:'b',hallIndex:8,wallSlot:3}];
  const before=layoutWorks(works),after=layoutWorks([works[1]]);
  assert.equal(before[1].id,after[0].id);assert.equal(after[0].hallIndex,8);
  assert.throws(()=>layoutWorks([works[0],works[0]]));
});
