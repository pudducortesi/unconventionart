import test from 'node:test';
import assert from 'node:assert/strict';
import { createPalazzoMarbleData } from '../js/museum/palazzo-marble-data.js';
import { createStoneFloor } from '../js/museum/stone-floor.js';
import * as T from '../vendor/three.module.js';

const data = createPalazzoMarbleData();
const sample = (x, z) => {
  const column = Math.round((x / 10 + .5) * (data.size - 1));
  const row = Math.round((z / 13 + .5) * (data.size - 1));
  return [...data.colour.slice((row * data.size + column) * 4, (row * data.size + column) * 4 + 3)];
};
const lightness = rgb => rgb.reduce((sum, value) => sum + value, 0) / 3;

test('palace marble has full-width axial bands, framed rosso panels and pale oval medallions', () => {
  const white = sample(3.9, 0), cross = sample(0, 6), red = sample(3.1, 2);
  const verde = sample(3.59, 0), cream = sample(0, 0), silver = sample(4.5, 0);
  assert(lightness(white) > 185 && lightness(cross) > 200, 'White borders remain luminous even at their grey veins');
  assert(red[0] > red[1] * 1.3 && red[1] > red[2], 'Rosso antico is red-brown, not tan');
  assert(verde[1] > verde[0] && verde[1] > verde[2] && lightness(verde) < 100, 'Deep verde frames');
  assert(lightness(cream) > 195 && cream[0] > cream[2] + 25, 'Large warm pale central medallion');
  assert(lightness(silver) > 135 && lightness(silver) < lightness(white), 'Grey outer inset bands');
  assert(lightness(sample(0, 4.6)) < 130, 'Oval ends reveal the surrounding red panel');
});

test('palace marble is deterministic and repeats seamlessly at the transverse white band', () => {
  const other = createPalazzoMarbleData();
  assert.equal(data.size, 1024, 'One shared 1024-pixel bay, not per-room texture copies');
  for (const channel of ['colour', 'normal', 'roughness']) {
    assert.deepEqual(data[channel], other[channel]);
    assert.equal(data[channel].length, 1024 * 1024 * 4);
  }
  for (let x = 0; x < data.size; x++) for (let c = 0; c < 4; c++) {
    const start = x * 4 + c, end = ((data.size - 1) * data.size + x) * 4 + c;
    assert.equal(data.colour[start], data.colour[end], 'No visible repeated-bay colour seam');
    assert.equal(data.roughness[start], data.roughness[end], 'Continuous polished finish');
    assert(Math.abs(data.normal[start] - data.normal[end]) <= 1, 'Near-flat periodic surface normals');
  }
});

test('palace marble keeps independent shallow surface detail and a polished, non-metallic finish', () => {
  let minimum = 255, maximum = 0;
  for (let i = 0; i < data.colour.length; i += 4) {
    assert.equal(data.colour[i + 3], 255);
    assert.equal(data.normal[i + 3], 255);
    assert.equal(data.roughness[i + 3], 255);
    assert(data.normal[i + 2] >= 254, 'Marble stays flat rather than embossed by colour veins');
    assert(Math.abs(data.normal[i] - 128) <= 2 && Math.abs(data.normal[i + 1] - 128) <= 2);
    const finish = data.roughness[i];
    assert(finish >= 40 && finish <= 70, 'Effective roughness stays polished at 0.16–0.28');
    minimum = Math.min(minimum, finish); maximum = Math.max(maximum, finish);
  }
  assert(maximum - minimum >= 12, 'Different stones and mineral clouds have distinct finish variation');
});

test('palace material owns only three shared maps, with linear surface data and sRGB colour', () => {
  const resources = [];
  const material = createStoneFloor(resource => { resources.push(resource); return resource; }, 4);
  assert.equal(resources.length, 4, 'Three maps and one material, independent of corridor length');
  assert(material instanceof T.MeshPhysicalMaterial);
  assert.equal(material.map.colorSpace, T.SRGBColorSpace);
  assert.equal(material.normalMap.colorSpace, T.NoColorSpace);
  assert.equal(material.roughnessMap.colorSpace, T.NoColorSpace);
  assert.equal(material.roughness, 1, 'The physical roughness is fully specified by the map');
  assert.equal(material.metalness, 0);
  assert.equal(material.clearcoat, .8);
  for (const texture of [material.map, material.normalMap, material.roughnessMap]) {
    assert.equal(texture.anisotropy, 4);
    assert.equal(texture.wrapT, T.RepeatWrapping);
    assert.equal(texture.generateMipmaps, true);
    assert.equal(texture.image.width, 1024);
  }
  resources.forEach(resource => resource.dispose());
});
