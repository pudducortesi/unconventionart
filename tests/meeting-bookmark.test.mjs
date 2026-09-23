import test from 'node:test';
import assert from 'node:assert/strict';
import {createMeetingBookmark} from '../js/museum/meeting-bookmark.js';
const now=Date.parse('2026-09-23T12:00:00Z'),key='ua-meeting-bookmark-v1';
const room={id:'room',invite:'11111111-1111-1111-1111-111111111111',name:'Visita insieme',expires_at:'2026-09-24T12:00:00Z',owner:true};
function setup(){const data=new Map();const storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};const bookmark=createMeetingBookmark(storage,()=>now);bookmark.remember(room,'alice');return {data,storage,bookmark};}
test('reload restores only the minimal bookmark for its account',()=>{
  const {storage}=setup(),saved=createMeetingBookmark(storage,()=>now).read('alice');
  assert.deepEqual(saved,{version:1,userId:'alice',invite:room.invite,name:room.name,expiresAt:room.expires_at});
});
test('expired, malformed, oversized and other-account bookmarks are discarded',()=>{
  for(const mutate of [v=>({...v,expiresAt:'2026-09-23T12:00:00Z'}),v=>({...v,invite:'invalid'}),v=>({...v,expiresAt:42}),v=>({...v,name:'x'}),v=>({...v,userId:'bob'})]){
    const {data,bookmark}=setup();data.set(key,JSON.stringify(mutate(JSON.parse(data.get(key)))));assert.equal(bookmark.read('alice'),null);assert.equal(data.size,0);
  }
  for(const raw of ['{','x'.repeat(2001)]){const {data,bookmark}=setup();data.set(key,raw);assert.equal(bookmark.read('alice'),null);assert.equal(data.size,0);}
});
test('missing and blocked storage are harmless; failed writes discard old data',()=>{
  for(const storage of [undefined,{getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}}]){
    const bookmark=createMeetingBookmark(storage,()=>now);bookmark.remember(room,'alice');assert.equal(bookmark.read('alice'),null);bookmark.clear();
  }
  const {storage,data,bookmark}=setup();storage.setItem=()=>{throw Error();};bookmark.remember(room,'alice');assert.equal(data.size,0);
});
test('resume explicitly rejoins on the server and returns authoritative data',async()=>{
  const {bookmark}=setup(),authoritative={...room,name:'Server name',owner:false};let calls=0;
  const service={user:{id:'alice'},rpc:async(action,payload)=>{calls++;assert.equal(action,'join');assert.deepEqual(payload,{invite:room.invite});return authoritative;}};
  bookmark.read('alice');assert.equal(calls,0);assert.equal(await bookmark.resume(service),authoritative);assert.equal(calls,1);
});
test('transient and full-room errors retain the bookmark; revoked access clears it',async()=>{
  for(const code of ['network','ua_room_full','ua_invite_invalid','ua_room_denied','ua_suspended']){
    const {bookmark}=setup();await assert.rejects(bookmark.resume({user:{id:'alice'},rpc:async()=>{throw Object.assign(Error(code),{code});}}));
    assert.equal(!!bookmark.read('alice'),['network','ua_room_full'].includes(code));
  }
});
test('late rejection cannot erase a newer meeting',async()=>{
  const {bookmark}=setup();let reject;const pending=bookmark.resume({user:{id:'alice'},rpc:()=>new Promise((_,r)=>{reject=r;})});
  const next={...room,invite:'22222222-2222-2222-2222-222222222222'};bookmark.remember(next,'alice');reject(Object.assign(Error('denied'),{code:'ua_room_denied'}));await assert.rejects(pending);assert.equal(bookmark.read('alice').invite,next.invite);
});
test('late success after an account change is rejected',async()=>{
  const {bookmark}=setup();let resolve;const service={user:{id:'alice'},rpc:()=>new Promise(r=>{resolve=r;})};const pending=bookmark.resume(service);service.user={id:'bob'};resolve(room);await assert.rejects(pending,/sessione è cambiata/);
});
test('auth expiry preserves the bookmark but explicit clear removes it',async()=>{
  const {bookmark}=setup();assert.equal(bookmark.read(null),null);assert.ok(bookmark.read('alice'));bookmark.clear();let calls=0;await assert.rejects(bookmark.resume({user:{id:'alice'},rpc:async()=>{calls++;}}),/Nessun incontro/);assert.equal(calls,0);
});
