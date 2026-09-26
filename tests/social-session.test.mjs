import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/social-session.js';
import {createSocialAccess} from '../server/social-access.mjs';
function env(t,key,value){const old=process.env[key];if(value===undefined)delete process.env[key];else process.env[key]=value;t.after(()=>{if(old===undefined)delete process.env[key];else process.env[key]=old;});}
const id='10000000-0000-4000-8000-000000000001',invite='20000000-0000-4000-8000-000000000001';
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};}
test('voice capabilities disclose no credentials and disabled voice cannot mint tokens',async t=>{
 for(const key of ['LIVEKIT_URL','LIVEKIT_API_KEY','LIVEKIT_API_SECRET','COLYSEUS_URL'])env(t,key,undefined);
 const res=response();await handler({method:'GET'},res);assert.deepEqual(res.body,{voice:false,realtime:null});assert.equal(res.headers['Cache-Control'],'no-store');
 const denied=response();await handler({method:'POST'},denied);assert.equal(denied.code,503);
});
test('voice tokens require an authenticated invite for the requested meeting and allow only microphone publishing',async t=>{
 env(t,'LIVEKIT_URL','wss://example.invalid');env(t,'LIVEKIT_API_KEY','test-key');env(t,'LIVEKIT_API_SECRET','test-secret-with-sufficient-length');
 t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(options.headers.Authorization,'Bearer test-access-token-is-long-enough');return {ok:true,json:async()=>url.includes('/auth/')?{id}:{id}};});
 const req={method:'POST',headers:{authorization:'Bearer test-access-token-is-long-enough'},body:{room:id,invite}};
 const res=response();await handler(req,res);assert.equal(res.code,200);const payload=JSON.parse(Buffer.from(res.body.token.split('.')[1],'base64url'));assert.equal(payload.sub,id);assert.equal(payload.video.room,id);assert.deepEqual(payload.video.canPublishSources,['microphone']);assert.equal(payload.video.canPublishData,false);assert(payload.exp-payload.nbf<=300);
 const wrong=response();await handler({...req,body:{room:invite,invite}},wrong);assert.equal(wrong.code,403);
 const unauth=response();await handler({...req,headers:{}},unauth);assert.equal(unauth.code,403);
});
test('meeting access propagates denial without exposing response content',async()=>{
 const access=createSocialAccess({url:'https://example.invalid',key:'public-key',fetcher:async()=>({ok:false,status:429})});
 await assert.rejects(access.snapshot('a'.repeat(30),id,{}),e=>e.status===429&&!e.message.includes('public-key'));
 await assert.rejects(access.join('a'.repeat(30),'invalid'));
});
