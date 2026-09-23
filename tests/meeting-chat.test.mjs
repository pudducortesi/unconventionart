import test from 'node:test';
import assert from 'node:assert/strict';
import {createUnreadMessages,createChatSender} from '../js/museum/meeting-chat.js';
const message=(id,time,user_id='peer')=>({id,user_id,created_at:new Date(time*1000).toISOString()});
const deferred=()=>{let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j;});return {promise,resolve,reject};};
function senderFixture(){
  let room='room-a',draft='Primo messaggio';const requests=[];
  const sender=createChatSender({getRoom:()=>room,getDraft:()=>draft,setDraft:value=>draft=value,post:(id,body)=>{const gate=deferred();requests.push({id,body,...gate});return gate.promise;}});
  return {sender,requests,get draft(){return draft;},edit(value){draft=value;sender.edited();},changeRoom(){room='room-b';sender.reset();draft='Nuova stanza';}};
}
test('Unread ignores initial history and own messages, deduplicates polls, and clears when read',()=>{
  const unread=createUnreadMessages(),history=[message('old',1)];
  assert.equal(unread.sync(history,'self'),0);
  const next=[...history,message('new',2),message('mine',3,'self')];
  assert.equal(unread.sync(next,'self'),1);assert.equal(unread.sync(next,'self'),1);
  unread.markRead();assert.equal(unread.count,0);assert.equal(unread.sync(next,'self'),0);
  assert.equal(unread.sync([...next,message('visible',4)],'self',true),0);
});
test('Unread handles equal timestamps and older messages returning after filtering without false alerts',()=>{
  const unread=createUnreadMessages();unread.sync([message('a',5)],'self');
  assert.equal(unread.sync([message('a',5),message('b',5)],'self'),1);
  assert.equal(unread.sync([message('a',5)],'self'),0,'Removed messages cannot keep a badge');
  assert.equal(unread.sync([message('older',2),message('a',5)],'self'),0);
  unread.reset();assert.equal(unread.sync([message('other-room',20)],'self'),0);
});
test('Unread remains limited to messages available in the server window',()=>{
  const unread=createUnreadMessages();unread.sync([],'self');
  for(let round=0;round<100;round++){
    const messages=Array.from({length:50},(_,i)=>message(String(round*50+i),round*50+i));
    assert.equal(unread.sync(messages,'self'),50);
  }
  assert.equal(unread.sync([],'self'),0);
});
test('An acknowledged send clears only its unchanged draft and rejects duplicate submission',async()=>{
  const f=senderFixture(),pending=f.sender.send();
  assert.equal(f.sender.busy,true);assert.equal(await f.sender.send(),false);assert.equal(f.requests.length,1);
  f.requests[0].resolve();assert.equal(await pending,true);assert.equal(f.draft,'');assert.equal(f.sender.busy,false);
});
test('Typing the next message, even the same words, survives an earlier acknowledgement',async()=>{
  for(const next of ['Secondo messaggio','Primo messaggio']){
    const f=senderFixture(),pending=f.sender.send();f.edit(next);f.requests[0].resolve();
    assert.equal(await pending,true);assert.equal(f.draft,next);
  }
});
test('Failed sends preserve the draft and permit an explicit retry',async()=>{
  const f=senderFixture(),pending=assert.rejects(f.sender.send(),/offline/);
  f.requests[0].reject(Error('offline'));await pending;assert.equal(f.draft,'Primo messaggio');assert.equal(f.sender.busy,false);
  const retry=f.sender.send();f.requests[1].resolve();assert.equal(await retry,true);assert.equal(f.draft,'');
});
test('Late replies from a previous room cannot clear its successor draft or release its pending send',async()=>{
  const f=senderFixture(),first=f.sender.send();f.changeRoom();const second=f.sender.send();
  f.requests[0].resolve();assert.equal(await first,false);assert.equal(f.draft,'Nuova stanza');assert.equal(f.sender.busy,true);
  assert.equal(f.requests[1].id,'room-b');f.requests[1].resolve();assert.equal(await second,true);assert.equal(f.draft,'');
});
test('An error from a room already left is ignored and whitespace-only drafts never reach the server',async()=>{
  const f=senderFixture(),first=f.sender.send();f.changeRoom();f.requests[0].reject(Error('old room'));
  assert.equal(await first,false);assert.equal(f.draft,'Nuova stanza');
  f.edit('  ');await assert.rejects(f.sender.send(),/1 e 500/);assert.equal(f.requests.length,1);
});
