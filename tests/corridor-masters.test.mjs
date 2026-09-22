import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { CORRIDOR_MASTERS } from '../js/museum/corridor-masters.js';

test('historical corridor has 51 distinct, locally published, proportionate museum images', async () => {
  assert.equal(CORRIDOR_MASTERS.length,51);
  assert.equal(new Set(CORRIDOR_MASTERS.map(w=>w.id)).size,51);
  const hashes=new Set(); let bytes=0;
  for(const work of CORRIDOR_MASTERS){
    assert.equal(work.license,'CC0');
    assert.match(work.source,/^https:\/\/www\.nga\.gov\/artworks\/\d+$/);
    assert(work.artist && work.title && work.date);
    const path='dist'+work.path;
    const data=await readFile(path); bytes+=data.length;
    hashes.add(createHash('sha256').update(data).digest('hex'));
    const size=await sharp(data).metadata();
    assert.equal(size.width,work.width); assert.equal(size.height,work.height);
    assert(Math.max(size.width,size.height)<=1024);
  }
  assert.equal(hashes.size,51,'No repeated downloaded image');
  assert(bytes<6*1024*1024,'The complete painting set stays below 6 MiB');
  assert((await stat('dist/images/palazzo/colonna-ceiling.webp')).size<700*1024);
  const credits=await readFile('dist/corridor-credits.html','utf8');
  assert.match(credits,/Orlando Paride/); assert.match(credits,/creativecommons.org\/licenses\/by-sa\/4.0/);
});
