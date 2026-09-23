import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, stat, writeFile, utimes, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGalleryService } from '../server/app.mjs';
const catalogue={collections:[{id:'test',description:'Serie pubblica'}],works:[{id:'public-01',title:'Opera',collection:'test',description:'Un ritratto.'}]};
async function fixture(t, options={}) {
  const directory=await mkdtemp(join(tmpdir(),'ua-service-'));
  const service=createGalleryService({catalogue,directory,origins:['https://gallery.test'],...options});
  await service.maintain();await new Promise(resolve=>service.server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>service.server.close(resolve));await rm(directory,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${service.server.address().port}`;
  const post=(path,body,headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://gallery.test',...headers},body:JSON.stringify(body)});
  return {...service,directory,base,post};
}
const valid={workId:'public-01',name:'Test',email:'test@example.test',message:'Informazioni sulla stampa',privacyAccepted:true};
test('disabled commerce stores nothing, catalogue contains public metadata only',async t=>{
  const f=await fixture(t);
  assert.equal((await f.post('/v1/inquiries',valid)).status,503);
  const response=await fetch(f.base+'/v1/catalogue'), data=await response.json();
  assert.equal(data.services.inquiries,false);assert.equal(data.services.curator,false);
  assert.equal(data.works.length,1);assert.equal(data.works[0].offer,null);
  assert.deepEqual(await readdir(f.directory),[]);
});
test('inquiry persists with restricted permissions, survives a new service instance and is not publicly readable',async t=>{
  const f=await fixture(t,{inquiriesEnabled:true,privacyUrl:'https://gallery.test/privacy'});
  const response=await f.post('/v1/inquiries',valid);assert.equal(response.status,201);
  const {id}=await response.json(), path=join(f.directory,id+'.json');
  const record=JSON.parse(await readFile(path,'utf8'));
  assert.equal(record.email,valid.email);assert.equal(record.workId,'public-01');
  assert.equal((await stat(path)).mode & 0o777,0o600);
  const restarted=createGalleryService({catalogue,directory:f.directory,inquiriesEnabled:true,privacyUrl:'https://gallery.test/privacy'});
  await restarted.maintain();assert.equal(JSON.parse(await readFile(path,'utf8')).id,id);
  assert.equal((await fetch(f.base+'/v1/inquiries/'+id)).status,404);
});
test('rejects unknown works, invalid contacts and missing privacy acknowledgment',async t=>{
  const f=await fixture(t,{inquiriesEnabled:true,privacyUrl:'https://gallery.test/privacy'});
  for(const patch of [{workId:'private-01'},{email:'invalid'},{privacyAccepted:false}]) assert.equal((await f.post('/v1/inquiries',{...valid,...patch})).status,400);
  assert.deepEqual(await readdir(f.directory),[]);
});
test('rejects foreign origins, invalid JSON, oversized bodies and limits submissions',async t=>{
  const f=await fixture(t);
  assert.equal((await f.post('/v1/curator',{},{Origin:'https://hostile.test'})).status,403);
  assert.equal((await fetch(f.base+'/v1/curator',{method:'POST',headers:{'Content-Type':'application/json'},body:'{broken'})).status,400);
  assert.equal((await f.post('/v1/curator',{question:'x'.repeat(9000)})).status,413);
  for(let i=0;i<3;i++)assert.equal((await f.post('/v1/inquiries',valid)).status,503);
  assert.equal((await f.post('/v1/inquiries',valid)).status,429);
});
test('editorial guide works without AI, failures fall back without exposing credentials',async t=>{
  const f=await fixture(t,{curator:{endpoint:'https://ai.test/chat',key:'secret',model:'configured'},fetchImpl:async()=>{throw Error('secret');}});
  const result=await (await f.post('/v1/curator',{workId:'public-01',question:'Raccontami questa opera'})).json();
  assert.deepEqual(result,{answer:'Un ritratto.',source:'editorial'});
});
test('AI receives only public work context and returns explicit source',async t=>{
  let sent;
  const f=await fixture(t,{curator:{endpoint:'https://ai.test/chat',key:'dedicated-key',model:'configured'},fetchImpl:async(url,options)=>{
    sent=JSON.parse(options.body);assert.equal(options.headers.Authorization,'Bearer dedicated-key');
    return {ok:true,json:async()=>({choices:[{message:{content:'Un ritratto in mostra.'}}]})};
  }});
  const result=await (await f.post('/v1/curator',{workId:'public-01',question:'Raccontami',email:'private@example.test'})).json();
  assert.equal(result.source,'ai');assert.equal(sent.model,'configured');
  assert.ok(!JSON.stringify(sent).includes('private@example.test'));
});
test('retention removes expired inquiries and leaves unrelated files intact',async t=>{
  const f=await fixture(t,{inquiriesEnabled:true,privacyUrl:'https://gallery.test/privacy',retentionDays:1});
  const file=join(f.directory,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.json');
  await writeFile(file,'{}');await utimes(file,new Date(0),new Date(0));await writeFile(join(f.directory,'keep.txt'),'keep');
  await f.maintain();assert.deepEqual(await readdir(f.directory),['keep.txt']);
});
test('activation refuses missing privacy or unsafe retention',()=>{
  assert.throws(()=>createGalleryService({catalogue,inquiriesEnabled:true}));
  assert.throws(()=>createGalleryService({catalogue,retentionDays:0}));
});
