import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {prepareCharacterStudio} from '../tools/prepare-characterstudio.mjs';
test('unavailable editor produces an explicit fallback without preventing gallery deployment',async t=>{
 const output=await mkdtemp(join(tmpdir(),'ua-editor-'));t.after(()=>rm(output,{recursive:true,force:true}));
 assert.equal(await prepareCharacterStudio({output,run(){throw Error('Download unavailable');}}),false);
 assert.deepEqual(JSON.parse(await readFile(output+'/status.json','utf8')),{available:false});
 assert.match(await readFile(output+'/index.html','utf8'),/Editor locale non disponibile/);
});
