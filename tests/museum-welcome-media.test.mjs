import test from 'node:test';
import assert from 'node:assert/strict';
import { museumPlan } from '../js/museum/museum-plan.js';
import { createVisitPreloader } from '../js/museum/visit-preloader.js';

test('masterplan has four floors and forty unique rooms, with real and future access distinguished',()=>{
 const plan=museumPlan(new Set([0]));
 assert.equal(plan.length,4);assert(plan.every(f=>f.rooms.length===10));
 const rooms=plan.flatMap(f=>f.rooms);
 assert.equal(new Set(rooms.map(r=>r.number)).size,40);
 assert.equal(rooms.filter(r=>r.status==='Aperta').length,1);
 assert.equal(rooms.filter(r=>r.status==='Chiusa').length,9);
 assert.equal(rooms.filter(r=>r.status==='Prevista').length,30);
 assert(rooms.filter(r=>r.status==='Prevista').every(r=>r.hallIndex===null));
});
test('predictive preload prioritises destination with bounded requests and stops on disposal',async()=>{
 const calls=[],pending=[];
 const slots=Array.from({length:12},(_,i)=>({x:i,z:0,work:{preview:`photo-${i}`}}));
 const warmer=createVisitPreloader(slots,url=>{calls.push(url);return new Promise(resolve=>pending.push(resolve));});
 warmer.approach({x:11,z:0});
 await Promise.resolve();assert.deepEqual(calls,['photo-11','photo-10']);
 warmer.approach({x:0,z:0});pending.shift()();
 await new Promise(resolve=>setImmediate(resolve));assert.equal(calls[2],'photo-0');
 warmer.dispose();pending.forEach(resolve=>resolve());
 await new Promise(resolve=>setImmediate(resolve));assert.equal(calls.length,3);
});
