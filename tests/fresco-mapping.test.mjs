import test from 'node:test';
import assert from 'node:assert/strict';
import { coverRegion } from '../js/museum/fresco-mapping.js';
import { CORRIDOR_VAULTS, CORRIDOR_END_MURAL } from '../js/museum/corridor-vaults.js';
import { CORRIDOR_MASTERS } from '../js/museum/corridor-masters.js';
import { vaultGeometry } from '../js/museum/classical-corridor.js';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

test('ceiling crops exclude added mattes while preserving physical image scale', () => {
  const geometry = vaultGeometry(4.81, 1.59, .005, 13);
  for (const work of CORRIDOR_VAULTS) for (const depth of [13, 19.5]) {
    const aspect = geometry.userData.surfaceWidth / depth;
    const crop = coverRegion(1536, 1536, aspect, work.imageRegion);
    const [x,y,w,h] = work.imageRegion;
    assert(Math.abs(crop.width / crop.height - aspect) < 1e-10);
    assert(crop.u * 1536 >= x - 1e-7);
    assert((crop.u + crop.width) * 1536 <= x + w + 1e-7);
    assert((1 - crop.v - crop.height) * 1536 >= y - 1e-7);
    assert((1 - crop.v) * 1536 <= y + h + 1e-7);
  }
  const p=geometry.attributes.position, uv=geometry.attributes.uv;
  for(let i=0;i<64;i++) {
    const a=i*4,b=a+4;
    const distance=Math.hypot(p.getX(b)-p.getX(a),p.getY(b)-p.getY(a));
    assert(Math.abs(distance/(uv.getX(b)-uv.getX(a))-geometry.userData.surfaceWidth)<.001,
      'Equal image scale at the spring line and the crown');
  }
  geometry.dispose();
});

test('end-wall composition is published and not repeated elsewhere', async () => {
  assert(![...CORRIDOR_VAULTS,...CORRIDOR_MASTERS].some(w=>w.id===CORRIDOR_END_MURAL.id));
  const data=await readFile('dist'+CORRIDOR_END_MURAL.path);
  const metadata=await sharp(data).metadata();
  assert.equal(metadata.width,CORRIDOR_END_MURAL.width);
  assert.equal(metadata.height,CORRIDOR_END_MURAL.height);
  assert(data.length<1500000);
});
