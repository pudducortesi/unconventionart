// Input stays independent of the scene: two thumbs may walk and look at once.
const KEY_ACTIONS = new Map([
  ["KeyW", "forward"],
  ["ArrowUp", "forward"],
  ["KeyS", "back"],
  ["ArrowDown", "back"],
  ["KeyA", "left"],
  ["ArrowLeft", "left"],
  ["KeyD", "right"],
  ["ArrowRight", "right"],
]);
const EPSILON = 0.0001;

export function normalizeStick(x, y, radius, deadZone = 0.055) {
  const length = Math.hypot(x, y);
  if (!radius || length <= radius * deadZone) return { x: 0, y: 0 };
  const strength = Math.pow(
    (Math.min(length / radius, 1) - deadZone) / (1 - deadZone),
    1,
  );
  return { x: (x / length) * strength, y: (y / length) * strength };
}

// Exact exponential integration keeps distance consistent at 30, 60 and 120 Hz.
// The returned movement is the average over this frame, not its final velocity.
export function createMotionFilter() {
  let forward = 0,
    sideways = 0,
    lookX = 0,
    lookY = 0,
    lookResponse = 0.012;
  const integrate = (current, target, dt, tau) => {
    const decay = Math.exp(-dt / tau);
    const next = target + (current - target) * decay;
    const average = target + ((current - target) * tau * (1 - decay)) / dt;
    return [Math.abs(next) < EPSILON && !target ? 0 : next, average];
  };
  return {
    addLook(x, y, response = 0.012) {
      lookResponse = response;
      lookX += x;
      lookY += y;
    },
    sample(dt, targetForward = 0, targetSideways = 0) {
      dt = Math.max(0.0001, Math.min(0.1, Number.isFinite(dt) ? dt : 1 / 60));
      const magnitude = Math.max(1, Math.hypot(targetForward, targetSideways));
      targetForward /= magnitude;
      targetSideways /= magnitude;
      const tau = targetForward || targetSideways ? 0.095 : 0.075;
      const [nextForward, averageForward] = integrate(
        forward,
        targetForward,
        dt,
        tau,
      );
      const [nextSideways, averageSideways] = integrate(
        sideways,
        targetSideways,
        dt,
        tau,
      );
      forward = nextForward;
      sideways = nextSideways;
      const fraction = 1 - Math.exp(-dt / lookResponse);
      const dx = Math.abs(lookX) < 0.00001 ? lookX : lookX * fraction;
      const dy = Math.abs(lookY) < 0.00001 ? lookY : lookY * fraction;
      lookX -= dx;
      lookY -= dy;
      return {
        forward: averageForward,
        sideways: averageSideways,
        lookX: dx,
        lookY: dy,
        active: !!(
          forward ||
          sideways ||
          targetForward ||
          targetSideways ||
          lookX ||
          lookY
        ),
      };
    },
    stopLook() {
      lookX = lookY = 0;
    },
    stop() {
      forward = sideways = lookX = lookY = 0;
    },
  };
}

export function createControls({
  canvas,
  joystickElement,
  knobElement,
  isEnabled = () => true,
  onTap = () => {},
  onActivity = () => {},
  onKeyboardAction = () => {},
  onWheel = () => {},
}) {
  const doc = canvas.ownerDocument;
  const win = doc.defaultView;
  const disposers = [];
  const keys = new Set();
  const touches = new Set();
  const filter = createMotionFilter();
  let lookPointer = null,
    stickPointer = null,
    stick = { x: 0, y: 0 };
  let disposed = false;
  const previousCanvasTouchAction = canvas.style.touchAction;
  const previousStickTouchAction = joystickElement?.style.touchAction;
  canvas.style.touchAction = "none";
  if (joystickElement) joystickElement.style.touchAction = "none";

  function listen(target, name, callback, options) {
    target.addEventListener(name, callback, options);
    disposers.push(() => target.removeEventListener(name, callback, options));
  }
  function activity(kind) {
    if (!disposed) onActivity({ kind });
  }
  function enabled() {
    return !disposed && !doc.hidden && isEnabled();
  }
  function focus() {
    if (!disposed) canvas.focus({ preventScroll: true });
  }
  function capture(element, id) {
    try {
      element.setPointerCapture(id);
    } catch {
      /* Released before capture. */
    }
  }
  function release(element, id) {
    try {
      if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
    } catch {}
  }
  function resetStick() {
    const id = stickPointer?.id;
    stickPointer = null;
    stick = { x: 0, y: 0 };
    if (knobElement) knobElement.style.transform = "";
    if (id !== undefined) release(joystickElement, id);
  }
  function stop(notify = true) {
    const id = lookPointer?.id;
    lookPointer = null;
    resetStick();
    keys.clear();
    touches.clear();
    filter.stop();
    if (id !== undefined) release(canvas, id);
    if (notify) activity("stop");
  }
  function movingInput() {
    return keys.size || Math.hypot(stick.x, stick.y) > 0;
  }

  // Observe the whole page: tapping a UI button with the other thumb must not
  // turn the look finger's release into an accidental floor destination.
  listen(
    win,
    "pointerdown",
    (event) => {
      if (event.pointerType !== "touch") return;
      touches.add(event.pointerId);
      if (lookPointer && touches.size > 1) lookPointer.noTap = true;
    },
    { capture: true, passive: true },
  );
  for (const name of ["pointerup", "pointercancel"])
    listen(win, name, (event) => touches.delete(event.pointerId), {
      capture: true,
      passive: true,
    });

  listen(
    canvas,
    "pointerdown",
    (event) => {
      if (
        !enabled() ||
        lookPointer ||
        (event.pointerType === "mouse" && event.button !== 0)
      )
        return;
      event.preventDefault();
      focus();
      lookPointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        started: event.timeStamp,
        dragged: false,
        noTap: touches.size > 1 || !!stickPointer || !!movingInput(),
        type: event.pointerType,
      };
      capture(canvas, event.pointerId);
    },
    { passive: false },
  );

  listen(
    canvas,
    "pointermove",
    (event) => {
      if (!lookPointer || event.pointerId !== lookPointer.id) return;
      if (!enabled()) {
        stop();
        return;
      }
      event.preventDefault();
      const pointer = lookPointer;
      const travelled = Math.hypot(
        event.clientX - pointer.startX,
        event.clientY - pointer.startY,
      );
      const threshold = pointer.type === "touch" ? 2.5 : 3;
      let dx = event.clientX - pointer.x,
        dy = event.clientY - pointer.y;
      if (!pointer.dragged && travelled > threshold) {
        pointer.dragged = true;
        dx = event.clientX - pointer.startX;
        dy = event.clientY - pointer.startY;
      }
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!pointer.dragged) return;
      const shortSide = Math.max(
        320,
        Math.min(canvas.clientWidth || 390, canvas.clientHeight || 844),
      );
      const touch = pointer.type === "touch";
      const sensitivity = touch ? 2.05 / shortSide : 0.0027;
      // A short, bounded follow-through absorbs event cadence without adding
      // velocity-based drift. Vertical movement is gentler than horizontal.
      filter.addLook(
        dx * sensitivity,
        dy * sensitivity * (touch ? 0.72 : 1),
        touch ? 0.035 : 0.012,
      );
      activity("look");
    },
    { passive: false },
  );

  listen(canvas, "pointerup", (event) => {
    if (!lookPointer || event.pointerId !== lookPointer.id) return;
    const pointer = lookPointer;
    lookPointer = null;
    release(canvas, event.pointerId);
    const duration = event.timeStamp - pointer.started;
    if (
      enabled() &&
      !pointer.dragged &&
      !pointer.noTap &&
      !movingInput() &&
      duration >= 0 &&
      duration < 450 &&
      Math.hypot(
        event.clientX - pointer.startX,
        event.clientY - pointer.startY,
      ) <= 8
    ) {
      onTap({
        clientX: event.clientX,
        clientY: event.clientY,
        pointerType: pointer.type,
      });
    }
  });
  for (const name of ["pointercancel", "lostpointercapture"])
    listen(canvas, name, (event) => {
      if (lookPointer?.id === event.pointerId) {
        lookPointer = null;
        filter.stopLook();
        touches.delete(event.pointerId);
      }
    });
  listen(canvas, "contextmenu", (event) => {
    if (enabled()) event.preventDefault();
  });
  listen(
    canvas,
    "wheel",
    (event) => {
      if (!enabled() || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      onWheel({ deltaY: event.deltaY, deltaMode: event.deltaMode });
    },
    { passive: false },
  );

  function updateStick(event) {
    const { x, y, radius } = stickPointer;
    const dx = event.clientX - x,
      dy = event.clientY - y;
    const distance = Math.hypot(dx, dy);
    const ratio = Math.min(1, radius / Math.max(distance, 0.001));
    stick = normalizeStick(dx, dy, radius);
    if (lookPointer && (stick.x || stick.y)) lookPointer.noTap = true;
    if (knobElement)
      knobElement.style.transform = `translate(${dx * ratio}px, ${dy * ratio}px)`;
    activity("move");
  }
  if (joystickElement) {
    listen(
      joystickElement,
      "pointerdown",
      (event) => {
        if (
          !enabled() ||
          stickPointer ||
          (event.pointerType === "mouse" && event.button !== 0)
        )
          return;
        event.preventDefault();
        focus();
        const rect = joystickElement.getBoundingClientRect();
        stickPointer = {
          id: event.pointerId,
          x:
            event.pointerType === "touch"
              ? event.clientX
              : rect.left + rect.width / 2,
          y:
            event.pointerType === "touch"
              ? event.clientY
              : rect.top + rect.height / 2,
          radius: Math.min(rect.width, rect.height) * 0.28,
        };
        if (lookPointer) lookPointer.noTap = true;
        capture(joystickElement, event.pointerId);
        updateStick(event);
      },
      { passive: false },
    );
    listen(
      joystickElement,
      "pointermove",
      (event) => {
        if (stickPointer?.id !== event.pointerId) return;
        if (!enabled()) {
          stop();
          return;
        }
        event.preventDefault();
        updateStick(event);
      },
      { passive: false },
    );
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
      listen(joystickElement, name, (event) => {
        if (stickPointer?.id !== event.pointerId) return;
        resetStick();
        touches.delete(event.pointerId);
        activity("move");
      });
  }

  listen(win, "keydown", (event) => {
    if (
      !enabled() ||
      (doc.activeElement !== canvas && doc.activeElement !== joystickElement) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    if (event.code === "Escape" || event.key === "Escape") {
      event.preventDefault();
      stop();
      onKeyboardAction("escape");
      return;
    }
    if (event.code === "KeyE" && !event.repeat) {
      event.preventDefault(); onKeyboardAction("interact"); return;
    }
    const action = KEY_ACTIONS.get(event.code);
    if (!action) return;
    event.preventDefault();
    keys.add(event.code);
    if (lookPointer) lookPointer.noTap = true;
    activity("move");
  });
  listen(win, "keyup", (event) => {
    if (!keys.delete(event.code)) return;
    activity("move");
  });
  listen(win, "blur", stop);
  listen(win, "pagehide", stop);
  let viewportWidth = canvas.clientWidth;
  listen(win, "resize", () => {
    const width = canvas.clientWidth;
    // Safari's expanding/collapsing address bar changes height, not orientation.
    if (Math.abs(width - viewportWidth) > 40 && (stickPointer || lookPointer))
      stop();
    viewportWidth = width;
  });
  listen(doc, "visibilitychange", () => {
    if (doc.hidden) stop();
  });
  listen(doc, "focusin", () => {
    if (doc.activeElement !== canvas && doc.activeElement !== joystickElement)
      stop();
  });

  return {
    sample(dt) {
      if (!enabled()) {
        stop(false);
        return { forward: 0, sideways: 0, lookX: 0, lookY: 0, active: false };
      }
      const actions = new Set([...keys].map((key) => KEY_ACTIONS.get(key)));
      const forward =
        Number(actions.has("forward")) - Number(actions.has("back")) - stick.y;
      const sideways =
        Number(actions.has("right")) - Number(actions.has("left")) + stick.x;
      return filter.sample(dt, forward, sideways);
    },
    stop,
    focus,
    dispose() {
      if (disposed) return;
      stop();
      disposed = true;
      disposers.forEach((dispose) => dispose());
      canvas.style.touchAction = previousCanvasTouchAction;
      if (joystickElement)
        joystickElement.style.touchAction = previousStickTouchAction;
    },
  };
}
