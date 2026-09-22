import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOM_FINISHES, addRoomWallFinishes } from '../js/museum/room-finishes.js';
import { HALLS, HANGING_CENTER, BUILDING } from '../js/museum/layout.js';

test('ten room identities have distinct palettes and physical wall relief', () => {
  assert.equal(new Set(ROOM_FINISHES.map(p => p.wall)).size, 10);
  const signatures = HALLS.map(hall => {
    const boxes = [];
    addRoomWallFinishes(hall, (...args) => boxes.push(args), 'paint', 'accent', 'trim', BUILDING.height);
    const relief = boxes.slice(11).filter(b => b[4] > 7 && b[4] < 12);
    if (hall.index === 0) {
      assert.equal(relief.length, 0, 'Portrait walls remain uninterrupted behind the upper compositions');
      return 'continuous portrait walls';
    }
    assert(relief.length > 0);
    // No upper relief hangs in front of the enlarged photography band.
    assert(relief.every(b => b[4] - b[1] / 2 > 6.8));
    return JSON.stringify(relief.map(b => b.slice(0, 3)));
  });
  assert.equal(new Set(signatures).size, 10);
});

test('enlarged photographs, frames and lower captions fit every wall bay', () => {
  for (const hall of HALLS) for (const slot of hall.slots) {
    const {width, height} = slot.format;
    assert(width >= 2.1 && height >= 2.267);
    assert(width + .2 < 3.8, 'Frame remains inside its exhibition envelope');
    assert(HANGING_CENTER - height / 2 - .30 - .43875 / 2 > 0,
      'Caption is entirely above the floor');
    assert(HANGING_CENTER + height / 2 + .25 < 6.2,
      'Frame and fixture remain below the mezzanine');
  }
});
