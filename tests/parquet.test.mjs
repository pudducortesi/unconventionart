import test from 'node:test';
import assert from 'node:assert/strict';
import { createParquetData } from '../js/museum/parquet-data.js';

test('mosaic parquet alternates four-strip squares by 90 degrees', () => {
  const { size, colour } = createParquetData();
  const red = (x, y) => colour[(y * size + x) * 4];
  // Every square has three internal seams, running in its own grain direction.
  for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) {
    for (const seam of [16, 32, 48]) {
      const rotated = (column + row) % 2;
      const x = column * 64 + (rotated ? 8 : seam);
      const y = row * 64 + (rotated ? seam : 8);
      const adjacent = rotated ? red(x, y + 3) : red(x + 3, y);
      assert(red(x, y) < adjacent * .88, 'Narrow joints follow the alternating strip orientation');
    }
  }
});

test('warm satin parquet has deterministic, separate colour and surface maps', () => {
  const a = createParquetData(), b = createParquetData();
  assert.equal(a.size, 512, 'Keep the existing texture memory budget');
  for (const channel of ['colour', 'normal', 'roughness']) {
    assert.deepEqual(a[channel], b[channel]);
    assert.equal(a[channel].length, 512 * 512 * 4);
  }
  for (let i = 0; i < a.colour.length; i += 4) {
    assert(a.colour[i] > a.colour[i + 1] && a.colour[i + 1] > a.colour[i + 2]);
    assert(a.roughness[i] >= 115 && a.roughness[i] <= 184);
    assert(a.normal[i + 2] >= 250, 'Surface detail stays shallow, not corrugated');
    assert.equal(a.colour[i + 3], 255);
  }
});
