import test from "node:test";
import assert from "node:assert/strict";
import {
  createControls,
  createMotionFilter,
  normalizeStick,
} from "../js/museum/controls.js";

class Target {
  handlers = new Map();
  style = {
    setProperty(name, value) {
      this[name] = value;
    },
    removeProperty(name) {
      delete this[name];
    },
  };
  dataset = {};
  captured = new Set();
  addEventListener(type, handler, options) {
    const list = this.handlers.get(type) || [];
    list.push({ handler, capture: !!options?.capture });
    this.handlers.set(type, list);
  }
  removeEventListener(type, handler) {
    this.handlers.set(
      type,
      (this.handlers.get(type) || []).filter(
        (item) => item.handler !== handler,
      ),
    );
  }
  emit(type, event, capture) {
    for (const item of this.handlers.get(type) || [])
      if (capture === undefined || capture === item.capture)
        item.handler(event);
  }
  setPointerCapture(id) {
    this.captured.add(id);
  }
  hasPointerCapture(id) {
    return this.captured.has(id);
  }
  releasePointerCapture(id) {
    this.captured.delete(id);
  }
}
function fixture() {
  const win = new Target(),
    doc = new Target(),
    canvas = new Target(),
    stick = new Target(),
    knob = new Target();
  doc.defaultView = win;
  doc.hidden = false;
  doc.pointerLockElement = null;
  canvas.ownerDocument = stick.ownerDocument = doc;
  canvas.clientWidth = 390;
  canvas.clientHeight = 844;
  canvas.focus = () => {
    doc.activeElement = canvas;
    doc.emit("focusin", {});
  };
  canvas.requestPointerLock = () => {
    doc.pointerLockElement = canvas;
    doc.emit("pointerlockchange", {});
  };
  doc.exitPointerLock = () => {
    doc.pointerLockElement = null;
    doc.emit("pointerlockchange", {});
  };
  stick.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 120,
    height: 120,
  });
  const taps = [],
    activity = [],
    keyboard = [],
    keyStates = [];
  let enabled = true;
  const control = createControls({
    canvas,
    joystickElement: stick,
    knobElement: knob,
    isEnabled: () => enabled,
    onTap: (event) => taps.push(event),
    onActivity: (event) => activity.push(event),
    onKeyboardAction: (event) => keyboard.push(event),
    onKeyStateChange: (keys) => keyStates.push(keys),
  });
  const fire = (target, type, values = {}) => {
    const event = {
      pointerId: 1,
      pointerType: "touch",
      button: -1,
      clientX: 200,
      clientY: 400,
      timeStamp: 100,
      preventDefault() {},
      ...values,
    };
    if (target !== win && target !== doc) win.emit(type, event, true);
    target.emit(type, event);
    if (target !== win && target !== doc) win.emit(type, event, false);
  };
  return {
    win,
    doc,
    canvas,
    stick,
    knob,
    control,
    fire,
    taps,
    activity,
    keyboard,
    keyStates,
    disable() {
      enabled = false;
    },
  };
}

test("acceleration and release cover the same distance at 30, 60 and 120 Hz", () => {
  const results = [30, 60, 120].map((rate) => {
    const filter = createMotionFilter();
    let distance = 0;
    for (let i = 0; i < rate; i++)
      distance += filter.sample(1 / rate, 1).forward / rate;
    for (let i = 0; i < rate; i++)
      distance += filter.sample(1 / rate).forward / rate;
    assert.equal(filter.sample(1 / rate).active, false);
    return distance;
  });
  assert(Math.max(...results) - Math.min(...results) < 0.00001);
});

test("short look smoothing preserves the whole gesture without ongoing drift", () => {
  const filter = createMotionFilter();
  filter.addLook(0.3, -0.1);
  let x = 0,
    y = 0;
  for (let i = 0; i < 60; i++) {
    const input = filter.sample(1 / 60);
    x += input.lookX;
    y += input.lookY;
  }
  assert(Math.abs(x - 0.3) < 1e-12);
  assert(Math.abs(y + 0.1) < 1e-12);
  assert.equal(filter.sample(1 / 60).active, false);
});

test("analog stick has a quiet center and a bounded diagonal", () => {
  assert.deepEqual(normalizeStick(1, 1, 40), { x: 0, y: 0 });
  const diagonal = normalizeStick(60, -60, 40);
  assert(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-12);
  assert(normalizeStick(20, 0, 40).x < normalizeStick(30, 0, 40).x);
});

test("the second touch with button -1 can look while the first thumb walks", () => {
  const f = fixture();
  f.fire(f.stick, "pointerdown", { clientX: 60, clientY: 20, pointerId: 1 });
  f.fire(f.stick, "pointermove", { clientX: 60, clientY: 0, pointerId: 1 });
  f.fire(f.canvas, "pointerdown", { pointerId: 2, isPrimary: false });
  f.fire(f.canvas, "pointermove", { pointerId: 2, clientX: 230, clientY: 410 });
  const input = f.control.sample(1 / 60);
  assert(input.forward > 0);
  assert(input.lookX > 0);
  assert(input.lookY > 0);
  f.fire(f.canvas, "pointerup", {
    pointerId: 2,
    timeStamp: 160,
    clientX: 230,
    clientY: 410,
  });
  assert(
    f.control.sample(1 / 60).forward > 0,
    "releasing look must not reset the stick",
  );
  assert.equal(f.taps.length, 0);
  f.control.dispose();
});

test("a multi-touch release cannot become an accidental floor tap", () => {
  const f = fixture();
  f.fire(f.canvas, "pointerdown", { pointerId: 1 });
  f.fire(f.stick, "pointerdown", { pointerId: 2, clientX: 60, clientY: 60 });
  f.fire(f.stick, "pointerup", { pointerId: 2, timeStamp: 140 });
  f.fire(f.canvas, "pointerup", { pointerId: 1, timeStamp: 150 });
  assert.equal(f.taps.length, 0);
  f.fire(f.canvas, "pointerdown", { pointerId: 3, timeStamp: 200 });
  f.fire(f.canvas, "pointerup", { pointerId: 3, timeStamp: 280 });
  assert.equal(f.taps.length, 1, "a fresh single-finger tap still works");
  f.control.dispose();
});

test("cancelled and lost joystick captures release movement and center the knob", () => {
  for (const ending of ["pointercancel", "lostpointercapture"]) {
    const f = fixture();
    f.fire(f.stick, "pointerdown", { clientX: 60, clientY: 20 });
    f.fire(f.stick, "pointermove", { clientX: 60, clientY: 0 });
    assert(f.control.sample(1 / 60).forward > 0);
    f.fire(f.stick, ending);
    for (let i = 0; i < 60; i++) f.control.sample(1 / 60);
    assert.equal(f.control.sample(1 / 60).active, false);
    assert.equal(f.knob.style.transform, "");
    f.control.dispose();
  }
});

test("focus loss, hidden document and a modal gate clear velocity immediately", () => {
  for (const reason of ["blur", "hidden", "disabled"]) {
    const f = fixture();
    f.fire(f.stick, "pointerdown", { clientX: 60, clientY: 20 });
    f.fire(f.stick, "pointermove", { clientX: 60, clientY: 0 });
    f.control.sample(1 / 60);
    if (reason === "blur") f.fire(f.win, "blur");
    if (reason === "hidden") {
      f.doc.hidden = true;
      f.fire(f.doc, "visibilitychange");
    }
    if (reason === "disabled") f.disable();
    assert.deepEqual(f.control.sample(1 / 60), {
      forward: 0,
      sideways: 0,
      lookX: 0,
      lookY: 0,
      active: false,
    });
    assert.equal(f.canvas.captured.size, 0);
    assert.equal(f.stick.captured.size, 0);
    f.control.dispose();
  }
});

test("keyboard movement combines with look and aliases do not release a held direction", () => {
  const f = fixture();
  f.control.focus();
  f.fire(f.win, "keydown", { code: "KeyW" });
  f.fire(f.win, "keydown", { code: "ArrowUp" });
  assert.deepEqual(f.keyStates, [["KeyW"], ["KeyW", "ArrowUp"]]);
  f.fire(f.win, "keyup", { code: "KeyW" });
  assert.deepEqual(f.keyStates.at(-1), ["ArrowUp"]);
  f.fire(f.canvas, "pointerdown", { pointerType: "mouse", button: 0 });
  f.fire(f.canvas, "pointermove", { pointerType: "mouse", clientX: 220 });
  const input = f.control.sample(1 / 60);
  assert(input.forward > 0);
  assert(input.lookX > 0);
  f.fire(f.win, "keydown", { code: "Escape" });
  assert.equal(f.control.sample(1 / 60).active, false);
  assert.deepEqual(f.keyStates.at(-1), []);
  assert.deepEqual(f.keyboard, ["escape"]);
  f.control.dispose();
});

test("right mouse button and disposed controls cannot start new input", () => {
  const f = fixture();
  f.fire(f.canvas, "pointerdown", { pointerType: "mouse", button: 2 });
  f.fire(f.canvas, "pointermove", { pointerType: "mouse", clientX: 280 });
  assert.equal(f.control.sample(1 / 60).active, false);
  f.control.dispose();
  f.fire(f.stick, "pointerdown", { clientX: 60, clientY: 20 });
  assert.equal(f.control.sample(1 / 60).active, false);
});

test("touch joystick starts at the thumb without a jump and responds to a short drag", () => {
  const f = fixture();
  f.fire(f.stick, "pointerdown", { clientX: 95, clientY: 25 });
  assert.equal(f.stick.dataset.active, "true");
  assert.equal(f.stick.style["--stick-x"], "95px");
  assert.equal(f.stick.style["--stick-y"], "25px");
  assert.match(f.knob.style.transform, /-50%/);
  assert.equal(f.control.sample(1 / 60).forward, 0);
  assert.equal(f.control.sample(1 / 60).sideways, 0);
  f.fire(f.stick, "pointermove", { clientX: 95, clientY: 15 });
  assert(f.control.sample(1 / 60).forward > 0);
  f.fire(f.stick, "pointerup", { clientX: 95, clientY: 15 });
  assert.equal(f.stick.dataset.active, "false");
  assert.equal(f.stick.style["--stick-x"], undefined);
  f.control.dispose();
});

test("pointer lock provides effortless mouse-look and click interaction", () => {
  const f = fixture();
  assert.equal(f.control.requestPointerLock(), true);
  assert.equal(f.doc.pointerLockElement, f.canvas);
  f.fire(f.win, "keydown", { code: "ArrowRight" });
  f.fire(f.doc, "mousemove", { movementX: 24, movementY: -12 });
  const input = f.control.sample(1 / 60);
  assert(input.lookX > 0);
  assert(input.lookY < 0);
  assert(input.sideways > 0);
  f.fire(f.canvas, "pointerdown", { pointerType: "mouse", button: 0 });
  assert.deepEqual(f.keyboard, ["interact"]);
  f.fire(f.win, "keydown", { code: "Escape", key: "Escape" });
  assert.equal(f.doc.pointerLockElement, null);
  assert.equal(f.control.sample(1 / 60).active, false);
  assert.deepEqual(f.keyStates.at(-1), []);
  assert.deepEqual(f.keyboard, ["interact", "escape"]);
  f.control.dispose();
});

test("Safari height-only resize preserves a held gesture; rotation releases it", () => {
  const f = fixture();
  f.fire(f.stick, "pointerdown", { clientX: 60, clientY: 60 });
  f.fire(f.stick, "pointermove", { clientX: 60, clientY: 35 });
  f.canvas.clientHeight = 760;
  f.fire(f.win, "resize");
  assert(f.control.sample(1 / 60).forward > 0);
  f.canvas.clientWidth = 844;
  f.fire(f.win, "resize");
  assert.equal(f.control.sample(1 / 60).active, false);
  f.control.dispose();
});

test("small touch drags respond, ease out and never become floor taps", () => {
  const f = fixture();
  f.fire(f.canvas, "pointerdown");
  f.fire(f.canvas, "pointermove", { clientX: 204 });
  const first = f.control.sample(1 / 60);
  assert(first.lookX > 0);
  f.fire(f.canvas, "pointerup", { clientX: 204, timeStamp: 160 });
  assert(f.control.sample(1 / 60).lookX > 0, "bounded follow-through");
  for (let i = 0; i < 60; i++) f.control.sample(1 / 60);
  assert.equal(f.control.sample(1 / 60).active, false);
  assert.equal(f.taps.length, 0);
  f.control.dispose();
});


test("interaction key fires once and respects canvas focus", () => {
  const f = fixture();
  f.fire(f.win, "keydown", {code: "KeyE"});
  assert.equal(f.keyboard.length, 0);
  f.canvas.focus();
  f.fire(f.win, "keydown", {code: "KeyE"});
  f.fire(f.win, "keydown", {code: "KeyE", repeat: true});
  assert.deepEqual(f.keyboard, ["interact"]);
  f.control.dispose();
});
