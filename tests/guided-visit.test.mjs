import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuidedVisit } from '../js/museum/guided-visit.js';
test('guided visit pauses without losing its stop and concludes without wrapping', () => {
  const visited = []; let pauses = 0;
  const guide = createGuidedVisit({ go: s => visited.push(s.title), onPause: () => pauses++, onChange() {} });
  guide.start([]); assert.equal(guide.state().active, false);
  guide.start([{title:'Soglia'}, {title:'Atelier'}]);
  guide.previous(); assert.deepEqual(visited, ['Soglia']);
  guide.pause(); guide.pause(); assert.equal(pauses, 1);
  assert.equal(guide.state().index, 0);
  guide.resume(); assert.equal(guide.state().paused, false);
  guide.next(); assert.equal(guide.state().index, 1);
  guide.previous(); assert.equal(guide.state().index, 0);
  guide.next(); guide.next(); assert.equal(guide.state().active, false);
  const count = visited.length; guide.resume(); guide.next();
  assert.equal(visited.length, count);
});
