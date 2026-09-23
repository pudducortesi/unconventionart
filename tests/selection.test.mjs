import test from 'node:test';
import assert from 'node:assert/strict';
import { createSelection, selectionFromHash, selectionLink } from '../js/museum/selection.js';
test('selection survives reload and rejects unpublished identifiers', () => {
  let value; const storage = { getItem: () => value, setItem: (_, v) => { value = v; } };
  const s = createSelection(['one', 'two'], storage);
  s.toggle('one'); s.toggle('unknown');
  assert.deepEqual(createSelection(['one','two'], storage).ids(), ['one']);
  s.toggle('one'); assert.deepEqual(s.ids(), []);
});
test('shared selections roundtrip and ignore malformed or external content', () => {
  const link = selectionLink('https://example.org/', ['one','two','one']);
  assert.deepEqual(selectionFromHash(new URL(link).hash, ['one']), ['one']);
  assert.deepEqual(selectionFromHash('#selection=%7B', ['one']), []);
  assert.equal(selectionFromHash('#work=one', ['one']), null);
});
test('blocked storage still permits session curation and sharing', () => {
  const s = createSelection(['one'], { getItem() { throw Error(); }, setItem() { throw Error(); } });
  s.toggle('one'); assert.deepEqual(s.ids(), ['one']); assert.equal(s.persistent, false);
});
