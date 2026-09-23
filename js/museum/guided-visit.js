// Explicit next/previous stops: visitors decide how long to stay with each work.
export function createGuidedVisit({ go, onChange, onPause }) {
  let steps = [], index = -1, paused = false;
  const state = () => ({ active: index >= 0, paused, index, total: steps.length, step: steps[index] });
  const notify = () => onChange(state());
  const travel = () => { paused = false; go(steps[index]); notify(); };
  return {
    state,
    start(next) { if (!next.length) return; steps = next; index = 0; travel(); },
    next() { if (index < 0) return; if (index === steps.length - 1) this.end(); else { index++; travel(); } },
    previous() { if (index <= 0) return; index--; travel(); },
    pause() { if (index < 0 || paused) return; paused = true; onPause(); notify(); },
    resume() { if (index >= 0 && paused) travel(); },
    end() { if (index < 0) return; index = -1; paused = false; onPause(); notify(); },
  };
}
