// Keep consecutive touch gestures in one resolution session. A timer wakes the
// demand-driven renderer once; waiting for detail must not run an animation loop.
export function createResolutionPolicy({ wake, schedule = setTimeout, cancel = clearTimeout, delay = 650 }) {
  let timer = null;
  let detail = false;
  return {
    get settled() { return detail; },
    sample(moving, motionRatio, detailRatio) {
      if (moving) {
        if (timer !== null) cancel(timer);
        timer = null;
        detail = false;
      } else if (!detail && timer === null) {
        timer = schedule(() => {
          timer = null;
          detail = true;
          wake();
        }, delay);
      }
      return detail ? detailRatio : motionRatio;
    },
    suspend() {
      if (timer !== null) cancel(timer);
      timer = null;
      detail = false;
    },
  };
}
