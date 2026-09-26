import test from 'node:test';
import assert from 'node:assert/strict';
import {watchCatalogue} from '../js/catalogue-updates.js';

test('catalogue revisions notify once without concurrent requests or automatic navigation',async()=>{
 let tick,resolve,calls=0,notices=0,cancelled=0,hidden=true;
 const stop=watchCatalogue({url:'/catalogue',revision:'old',isHidden:()=>hidden,schedule:fn=>(tick=fn,1),cancel:()=>cancelled++,onUpdate:()=>notices++,fetcher:()=>{calls++;return new Promise(r=>resolve=r);}});
 await tick();assert.equal(calls,0);hidden=false;
 const pending=tick();await tick();assert.equal(calls,1);
 resolve({ok:true,json:async()=>({revision:'new'})});await pending;await tick();
 assert.equal(notices,1);assert.equal(cancelled,1);assert.equal(calls,1);stop();
});
test('archive errors preserve the visit; disposal ignores late responses',async()=>{
 let tick,mode=0,resolve,notices=0;
 const stop=watchCatalogue({url:'/catalogue',revision:'old',isHidden:()=>false,schedule:fn=>(tick=fn,1),cancel(){},onUpdate:()=>notices++,fetcher:async()=>{
  if(mode===0)throw Error('offline');if(mode===1)return {ok:false};if(mode===2)return {ok:true,json:async()=>({revision:'old'})};
  return new Promise(r=>resolve=r);
 }});
 await tick();mode=1;await tick();mode=2;await tick();assert.equal(notices,0);
 mode=3;const pending=tick();stop();resolve({ok:true,json:async()=>({revision:'new'})});await pending;assert.equal(notices,0);
});
