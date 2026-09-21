import test from 'node:test';
import assert from 'node:assert/strict';
import { EXHIBITION_ZONES, FURNITURE, HALLS } from '../js/museum/layout.js';

test('all 200 exhibition envelopes remain clear of furniture and screens', () => {
  assert.equal(EXHIBITION_ZONES.length, 200);
  assert.equal(new Set(EXHIBITION_ZONES.map(zone => zone.slotId)).size, 200);
  for (const zone of EXHIBITION_ZONES) for (const piece of FURNITURE) {
    const overlaps = zone.minX < piece.maxX && zone.maxX > piece.minX &&
      zone.minZ < piece.maxZ && zone.maxZ > piece.minZ;
    assert(!overlaps, `${zone.slotId} overlaps ${piece.kind} at ${piece.x}, ${piece.z}`);
  }
  assert(!FURNITURE.some(piece => piece.kind === 'screen' && piece.hallIndex === 0));
  assert.equal(HALLS[0].slots[0].x, -26.7);
});
