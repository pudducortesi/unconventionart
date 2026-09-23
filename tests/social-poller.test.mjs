import test from 'node:test';
import assert from 'node:assert/strict';
import {createSocialPoller} from '../js/museum/social-poller.js';
const flush=()=>new Promise(r=>setImmediate(r));
function fixture(){
  const requests=[],received=[],errors=[],timers=new Map();let next=0;
  const poller=createSocialPoller({
    request:()=>new Promise((resolve,reject)=>requests.push({resolve,reject})),
    onData:data=>received.push(data),onError:error=>errors.push(error),
    schedule:(callback,delay)=>{const id=++next;timers.set(id,{callback,delay});return id;},
    cancel:id=>timers.delete(id),
  });
  const tick=()=>{const [id,timer]=timers.entries().next().value;timers.delete(id);timer.callback();return timer.delay;};
  return {poller,requests,received,errors,timers,tick};
}
test('Suspending discards a pending response and leaves no background polling',async()=>{
  const f=fixture();f.poller.start();f.poller.stop();f.requests[0].resolve({people:['old']});await flush();
  assert.deepEqual(f.received,[]);assert.equal(f.timers.size,0);
  f.poller.start();f.requests[1].resolve({people:['current']});await flush();
  assert.deepEqual(f.received,[{people:['current']}]);assert.equal(f.timers.size,1);
  f.poller.stop();assert.equal(f.timers.size,0);
});
test('Rapid suspension and restart never overlap requests or restore stale room errors',async()=>{
  const f=fixture();f.poller.start();f.poller.stop();f.poller.start();f.poller.start();
  assert.equal(f.requests.length,1);f.requests[0].reject(Error('old room closed'));await flush();
  assert.deepEqual(f.errors,[]);assert.equal(f.timers.size,1);assert.equal(f.tick(),1000);
  assert.equal(f.requests.length,2);f.requests[1].resolve({room:'new'});await flush();
  assert.deepEqual(f.received,[{room:'new'}]);f.poller.stop();
});
test('Connection failures back off, then successful recovery restores the normal interval',async()=>{
  const f=fixture();f.poller.start();
  for(let i=0;i<12;i++){f.requests[i].reject(Error('offline'));await flush();assert.equal(f.tick(),Math.min(10000,(i+1)*1000));}
  f.requests[12].resolve({people:['back']});await flush();assert.equal(f.tick(),1000);
  assert.equal(f.errors.length,12);assert.deepEqual(f.received,[{people:['back']}]);
  f.poller.stop();f.requests[13].resolve({});await flush();assert.equal(f.timers.size,0);
});
