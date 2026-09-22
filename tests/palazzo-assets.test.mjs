import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

test('the original palace decorations deploy as bounded WebP textures, outside the artwork catalogue', async () => {
  const catalogue = await readFile('data/catalogue.json', 'utf8');
  let totalBytes = 0;
  for (const name of ['fresco-vault', 'paintings-atlas']) {
    const path = `images/palazzo/${name}.webp`;
    const bytes = await readFile(path);
    const published = await readFile(`dist/${path}`);
    const metadata = await sharp(bytes).metadata();
    assert(bytes.equals(published), 'The deployed texture must match the inspected source');
    assert.equal(metadata.format, 'webp');
    assert(metadata.width <= 2048 && metadata.height <= 2048, 'Avoid oversized GPU textures on iPad');
    assert(metadata.width >= 1024 && metadata.height >= (name === 'fresco-vault' ? 768 : 1024), 'Keep painted details legible');
    assert(!catalogue.includes(path), 'Scenographic paintings are not catalogue works');
    const stats = await sharp(bytes).stats();
    assert(stats.channels.slice(0, 3).every(channel => channel.stdev > 18), 'Decorations must contain painted detail, not blank placeholders');
    totalBytes += bytes.length;
  }
  assert(totalBytes < 800_000, 'Share two compressed textures across the corridor');
});
