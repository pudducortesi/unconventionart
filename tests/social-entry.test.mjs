import test from 'node:test';
import assert from 'node:assert/strict';
import {readSocialEntry,invitationURL,clearPendingInvite} from '../js/museum/social-entry.js';
import {snapTurn} from '../js/museum/xr-input.js';
const invite='10000000-0000-4000-8000-000000000001';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
test('Invitations always use the public gallery, never a protected deployment',()=>{
  assert.equal(invitationURL(invite),`https://unconventionart.vercel.app/#visit=${invite}`);
  assert.throws(()=>invitationURL('javascript:alert(1)'));
});
test('An incoming invitation survives account confirmation and clears after participation',()=>{
  const storage=memory(),history={replaceState(){}};
  assert.equal(readSocialEntry({href:`https://unconventionart.vercel.app/#visit=${invite}`},history,storage).invite,invite);
  assert.equal(readSocialEntry({href:'https://unconventionart.vercel.app/'},history,storage).invite,invite);
  clearPendingInvite(storage);assert.equal(readSocialEntry({href:'https://unconventionart.vercel.app/'},history,storage).invite,null);
});
test('Auth fragments are removed immediately and never persisted',()=>{
  const storage=memory();let replaced;
  const entry=readSocialEntry({href:'https://unconventionart.vercel.app/?account=1#access_token=example&refresh_token=refresh&type=recovery&expires_in=3600'}, {replaceState(_a,_b,url){replaced=url;}},storage);
  assert.equal(replaced,'/?account=1');assert.equal(entry.auth.type,'recovery');assert(entry.requested);
  assert.equal(storage.getItem('ua-pending-invite'),undefined);
});
test('Non-auth fragment selections remain intact and blocked storage is tolerated',()=>{
  assert.doesNotThrow(()=>readSocialEntry({href:`https://unconventionart.vercel.app/#visit=${invite}`},{replaceState(){throw Error();}},{getItem(){throw Error();},setItem(){throw Error();}}));
  const entry=readSocialEntry({href:'https://unconventionart.vercel.app/#selection=test'},{replaceState(){throw Error();}},memory());
  assert.equal(entry.auth,null);assert.equal(entry.requested,false);
});
test('Snap turn triggers once per deflection and rearms only after neutral',()=>{
  let r=snapTurn([0,0,1,0]);assert.equal(r.angle,-Math.PI/6);assert.equal(r.armed,false);
  r=snapTurn([0,0,1,0],r.armed);assert.equal(r.angle,0);
  r=snapTurn([0,0,.4,0],r.armed);assert.equal(r.armed,false);
  r=snapTurn([0,0,0,0],r.armed);assert.equal(r.armed,true);
  assert.equal(snapTurn([-1,0],r.armed).angle,Math.PI/6);
  assert.equal(snapTurn(undefined).angle,0);
});
