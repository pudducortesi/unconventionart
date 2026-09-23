import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {DEFAULT_AVATAR,AVATAR_OPTIONS,AVATAR_RANGES,normalizeAvatar} from '../js/museum/social-model.js';
import {createAvatarHistory,createLookStore,randomAvatar,exportAvatar,importAvatar} from '../js/museum/avatar-studio-state.js';
import {createAvatar} from '../js/museum/social-avatar.js';

test('studio normalization bounds dimensions and rejects executable or malformed fields',()=>{
  assert.deepEqual(normalizeAvatar(null),DEFAULT_AVATAR);
  const a=normalizeAvatar({height:1e9,jaw:-1,eyes:'url(evil)',model:'https://evil',nose:NaN,lipSize:'120',waist:102.6});
  assert.equal(a.height,115);assert.equal(a.jaw,80);assert.equal(a.nose,100);assert.equal(a.lipSize,100);assert.equal(a.waist,103);assert.equal(a.model,'classic');assert.equal(a.eyes,DEFAULT_AVATAR.eyes);
});
test('history isolates snapshots, coalesces equal values, supports undo redo and caps history',()=>{
  const h=createAvatarHistory(DEFAULT_AVATAR);h.set({...h.value,height:110});h.set({...h.value,height:110});h.value.height=2;assert.equal(h.value.height,110);
  assert.equal(h.undo().height,100);assert.equal(h.canUndo,false);assert.equal(h.redo().height,110);
  h.undo();h.set({...h.value,jaw:90});assert.equal(h.canRedo,false);
  for(let i=0;i<80;i++)h.set({...h.value,height:i%2?100:110});let n=0;while(h.canUndo){h.undo();n++;}assert.equal(n,40);
  h.reset(DEFAULT_AVATAR);assert.equal(h.canUndo,false);assert.equal(h.canRedo,false);
});
test('look storage survives reload with a strict eight-look limit and reports storage failures',()=>{
  const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)},looks=createLookStore(storage);
  for(let i=0;i<8;i++)looks.save('Look '+i,{...DEFAULT_AVATAR,height:85+i});assert.throws(()=>looks.save('Ninth',DEFAULT_AVATAR),/8 look/);
  assert.equal(createLookStore(storage).read()[3].avatar.height,88);looks.remove(3);assert.equal(looks.read().length,7);
  assert.throws(()=>looks.save(' ',DEFAULT_AVATAR));assert.throws(()=>createLookStore().save('Test',DEFAULT_AVATAR),/non disponibile/);
  assert.throws(()=>createLookStore({setItem(){throw Error();}}).save('Test',DEFAULT_AVATAR),/Impossibile/);
  map.set('ua-avatar-looks-v1','{');assert.deepEqual(looks.read(),[]);
});
test('portable exports round-trip without URLs, account IDs or arbitrary properties',()=>{
  const a=normalizeAvatar({...DEFAULT_AVATAR,model:'studio',garment:'dress',height:112});assert.deepEqual(importAvatar(exportAvatar({...a,userId:'secret',url:'evil'})),a);
  assert.throws(()=>importAvatar('{'));assert.throws(()=>importAvatar('x'.repeat(12001)));assert.throws(()=>importAvatar('{"version":2}'));
  for(let i=0;i<20;i++){const random=randomAvatar();assert.equal(random.model,'studio');assert.deepEqual(normalizeAvatar(random),random);}
});
test('all new garments, hair and facial bounds produce finite animated meshes',()=>{
  for(const garment of AVATAR_OPTIONS.garment)for(const style of AVATAR_OPTIONS.style){
    const a=createAvatar({...DEFAULT_AVATAR,model:'studio',garment,style,beard:'full',height:115,faceWidth:115,jaw:120,nose:125,eyeSize:120,lipSize:125,shoulders:115,hips:115,waist:80});
    for(let frame=0;frame<10;frame++)a.userData.animate(.033,frame*33,1,true);a.updateMatrixWorld(true);
    a.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
    assert.ok(Math.abs(a.getObjectByName('avatar-nose').scale.x-.023*1.25)<1e-10);
    assert.equal(!!a.getObjectByName('avatar-skirt'),garment==='dress');a.userData.dispose();a.userData.dispose();
  }
});
test('server and browser agree on all enum values and slider endpoints; invalid data is rejected',async t=>{
  const db=new PGlite();t.after(()=>db.close());
  await db.exec('create schema ua_social;create role anon;create role authenticated;');
  const sql=await readFile('infra/avatar-studio.sql','utf8');await db.exec(sql.slice(0,sql.indexOf('-- Preserve the deployed dispatcher')));
  const normalize=async value=>(await db.query('select ua_social.normalize_avatar($1::jsonb) as value',[JSON.stringify(value)])).rows[0].value;
  assert.deepEqual(await normalize({}),DEFAULT_AVATAR);
  for(const [key,values]of Object.entries(AVATAR_OPTIONS))for(const value of values)assert.deepEqual(await normalize({[key]:value}),normalizeAvatar({[key]:value}));
  for(const [key,[min,max]]of Object.entries(AVATAR_RANGES)){
    for(const value of [min,max])assert.deepEqual(await normalize({[key]:value}),normalizeAvatar({[key]:value}));
    for(const value of [min-1,max+1,100.5,'100',null,{},[]])await assert.rejects(normalize({[key]:value}),/ua_invalid_avatar/);
  }
  for(const value of [null,[],4,'text',{model:'https://evil.test/model'},{hair:null},{garment:{}}])await assert.rejects(normalize(value),/ua_invalid_avatar/);
});
