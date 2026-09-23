import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { floorPoint, floorVisibility, floorIrradiance, sampleEmitters, bakeFloor } from '../tools/bake-lighting.mjs';
import { FLOOR_REGIONS } from '../js/museum/lighting-layout.js';
import { FLOOR_LIGHTMAPS } from '../vendor/gallery-lightmaps.js';

test('ceiling area lights produce symmetric, distance-dependent illumination', () => {
  const source = sampleEmitters([{ x: 0, z: 0, width: 7, depth: 5, height: 6.4, power: 11 }]);
  assert(floorIrradiance(0, 0, source) > floorIrradiance(10, 0, source));
  assert(Math.abs(floorIrradiance(-3, 2, source) - floorIrradiance(3, -2, source)) < 1e-12);
  assert.equal(floorIrradiance(0, 0, []), .12, 'Retain restrained ambient fill');
});

test('contact shade stays local, darkens occluded floor and softens with distance', () => {
  const box = { minX: -1, maxX: 1, minZ: -1, maxZ: 1, height: .8 };
  assert.equal(floorVisibility(0, 0, []), 1);
  assert(floorVisibility(0, 0, [box]) < .25);
  assert(floorVisibility(1.1, 0, [box]) < floorVisibility(2, 0, [box]));
  assert.equal(floorVisibility(5, 0, [box]), 1, 'Do not shadow unrelated rooms');
});

test('lightmap orientation follows the rotated floor UVs and baking is reproducible', () => {
  const region = FLOOR_REGIONS[1];
  assert.deepEqual(floorPoint(region, 0, 0), { x: region.x - 11, z: region.z + 13 });
  assert.deepEqual(floorPoint(region, 1, 1), { x: region.x + 11, z: region.z - 13 });
  const a = bakeFloor(region, 8, 8), b = bakeFloor(region, 8, 8);
  assert.deepEqual(a, b);
  assert(new Set(a.light).size > 10, 'Bake spatial illumination, not a constant tint');
});

test('every walkable finish has a compact baked map with separate linear occlusion', async () => {
  assert.deepEqual(Object.keys(FLOOR_LIGHTMAPS), FLOOR_REGIONS.map(region => region.id));
  let bytes = 0;
  for (const { width, height, light, occlusion } of Object.values(FLOOR_LIGHTMAPS)) {
    const irradiance = Buffer.from(light, 'base64'), ao = Buffer.from(occlusion, 'base64');
    assert.equal(irradiance.length, width * height);
    assert.equal(ao.length, width * height);
    assert(Math.min(...ao) >= 50 && Math.max(...ao) === 255);
    bytes += irradiance.length * 4 + ao.length;
  }
  assert(bytes < 350_000, 'Static lighting must have a small, fixed GPU footprint');
  assert(gzipSync(await readFile('vendor/gallery-lightmaps.js')).length < 40_000,
    'Precalculated lighting must remain affordable to download');
});
