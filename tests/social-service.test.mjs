import test from 'node:test';
import assert from 'node:assert/strict';
import {createSocialService} from '../js/museum/social-service.js';
const KEY='ua-social-session-v1';
const reply=(data,status=200)=>({ok:status<400,status,json:async()=>data});
const session=(id='a',expired=false)=>({user:{id},access_token:'test-access-'+id,refresh_token:'test-refresh-'+id,expires_at:Date.now()/1000+(expired?-1:3600)});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const flush=()=>new Promise(r=>setImmediate(r));
async function fixture(initial,handler){
  const values=new Map(initial?[[KEY,JSON.stringify(initial)]]:[]),calls=[];
  const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  const service=await createSocialService(async(url,options)=>{
    if(url==='data/publishing.json')return reply({enabled:true,supabaseUrl:'https://social.test',publishableKey:'test-public-key'});
    calls.push({url,options});return handler(url,options);
  },storage);
  return {service,values,calls};
}

test('Network, timeout, rate limit and server failures preserve the session for recovery',async()=>{
  for(const fail of [()=>{throw new TypeError('offline');},()=>{throw new DOMException('timeout','TimeoutError');},()=>({ok:true,status:200,json:async()=>{throw new TypeError('body interrupted');}}),()=>reply({}),()=>reply({code:'over_request_rate_limit'},429),()=>reply({code:'unexpected_failure'},503)]){
    let recovering=false;
    const f=await fixture(session('a',true),url=>url.includes('refresh_token')?(recovering?reply(session('a')):fail()):reply({participants:[]}));
    await assert.rejects(f.service.rpc('tick'));
    assert.equal(f.service.user.id,'a');assert.ok(f.values.has(KEY));
    recovering=true;assert.deepEqual(await f.service.rpc('tick'),{participants:[]});
    assert.equal(f.calls.filter(c=>c.url.includes('refresh_token')).length,2);
  }
});

test('Revoked refresh token ends the session and does not send the RPC',async()=>{
  const f=await fixture(session('a',true),()=>reply({code:'refresh_token_not_found',message:'Invalid Refresh Token'},400));
  await assert.rejects(f.service.rpc('tick'),/Sessione scaduta/);
  assert.equal(f.service.user,null);assert.equal(f.values.has(KEY),false);assert.equal(f.calls.length,1);
});

test('Concurrent actions share a single refresh and use the new token',async()=>{
  const gate=deferred();
  const f=await fixture(session('a',true),url=>url.includes('refresh_token')?gate.promise:reply({ok:true}));
  const a=f.service.rpc('tick'),b=f.service.rpc('chat');
  await flush();assert.equal(f.calls.length,1);
  const updated=session('a');updated.access_token='test-rotated';gate.resolve(reply(updated));
  await Promise.all([a,b]);assert.equal(f.calls.length,3);
  for(const call of f.calls.slice(1))assert.equal(call.options.headers.Authorization,'Bearer test-rotated');
});

test('Logout during renewal cannot be undone by a late refresh response',async()=>{
  const gate=deferred();
  const f=await fixture(session('a',true),url=>url.includes('refresh_token')?gate.promise:reply({}));
  const pending=assert.rejects(f.service.rpc('tick'),{code:'ua_session_changed'});
  await flush();await f.service.logout();
  assert.equal(f.service.user,null);gate.resolve(reply(session('a')));await pending;
  assert.equal(f.service.user,null);assert.equal(f.values.has(KEY),false);
  assert.equal(f.calls.filter(c=>c.url.includes('/rpc/')).length,0);
});

test('Late unauthorized response from an old account does not log out the new account',async()=>{
  const gate=deferred();
  const f=await fixture(session('a'),url=>url.includes('/rpc/')?gate.promise:reply(session('b')));
  const old=assert.rejects(f.service.rpc('tick'),/Sessione scaduta/);await flush();
  await f.service.login('b@example.test','test-password');
  gate.resolve(reply({message:'JWT expired'},401));await old;
  assert.equal(f.service.user.id,'b');assert.equal(JSON.parse(f.values.get(KEY)).user.id,'b');
});

test('Old account data cannot be returned after a new login',async()=>{
  const gate=deferred();
  const f=await fixture(session('a'),url=>url.includes('/rpc/')?gate.promise:reply(session('b')));
  const old=assert.rejects(f.service.rpc('profile'),{code:'ua_session_changed'});await flush();
  await f.service.login('b@example.test','test-password');
  gate.resolve(reply({profile:{name:'old account'}}));await old;assert.equal(f.service.user.id,'b');
});

test('Logout failure clears local credentials immediately without removing a later login',async()=>{
  const gate=deferred();
  const f=await fixture(session('a'),url=>url.includes('/logout')?gate.promise:reply(session('b')));
  const logout=assert.rejects(f.service.logout());assert.equal(f.service.user,null);assert.equal(f.values.has(KEY),false);
  await f.service.login('b@example.test','test-password');
  gate.resolve(reply({message:'JWT expired'},401));await logout;assert.equal(f.service.user.id,'b');
});

test('Logout also cancels an unfinished sign-in',async()=>{
  const gate=deferred(),f=await fixture(null,()=>gate.promise);
  const login=assert.rejects(f.service.login('a@example.test','test-password'),{code:'ua_session_changed'});
  await f.service.logout();gate.resolve(reply(session('a')));await login;assert.equal(f.service.user,null);
});

test('An unauthorized response for the current credentials requires a new login',async()=>{
  const f=await fixture(session('a'),()=>reply({message:'JWT expired'},401));
  await assert.rejects(f.service.rpc('tick'),/Sessione scaduta/);
  assert.equal(f.service.user,null);assert.equal(f.values.has(KEY),false);
});
