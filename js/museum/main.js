import * as T from "../../vendor/three.module.js";
import { loadCatalogue } from "../catalogue.js";
import { createArchitecture, createArtwork } from "./architecture.js";
import { createControls } from "./controls.js";
import { createArtStream } from "./streaming.js";
import {
  HALLS,
  BOUNDS,
  INITIAL,
  INITIAL_TARGET,
  CAPACITY,
  locateHall,
} from "./layout.js";
import {
  moveWithCollision,
  orientation,
  shortestAngle,
  layoutWorks,
  findPath,
  viewingDistance,
  safeViewpoint,
} from "./navigation.js";

const $ = (selector) => document.querySelector(selector);
const root = $("#scene"),
  mobile = matchMedia("(pointer:coarse)").matches;
const reduced = matchMedia("(prefers-reduced-motion:reduce)");
let smooth = !reduced.matches;
try {
  if (localStorage.getItem("ua-motion") === "off") smooth = false;
} catch {}
let renderer,
  scene,
  camera,
  architecture,
  controls,
  stream,
  catalogue,
  slots = [];
let entered = false,
  disposed = false,
  modalOpen = false,
  selected = -1,
  hallIndex = -2;
let frame = 0,
  lastTime = 0,
  lastHud = 0,
  lastStream = 0,
  frameAverage = 16.7,
  qualityFrames = 0;
let viewport = { width: innerWidth, height: innerHeight };
let movementPixelRatio = Math.min(devicePixelRatio, mobile ? 1.1 : 1.5);
let detailArtwork = null;
const player = { x: INITIAL.x, z: INITIAL.z };
const initialLook = orientation(INITIAL, INITIAL_TARGET);
let yaw = initialLook.yaw,
  pitch = initialLook.pitch,
  path = [],
  finalLook = null;
const plaques = new Map(),
  ray = new T.Raycaster(),
  pointerCoords = new T.Vector2();
const scratch = new T.Vector3(),
  direction = new T.Vector3();
const collectionFor = (work) =>
  catalogue.collections.find((c) => c.id === work.collection);
const announce = (text) => {
  $("#announcement").textContent = text;
};

function invalidate() {
  if (renderer && camera && !frame && !disposed && !document.hidden) {
    if (!lastTime) lastTime = performance.now();
    frame = requestAnimationFrame(render);
  }
}
function stop() {
  controls?.stop();
  path = [];
  finalLook = null;
}
function clearSelection() {
  if (selected < 0) return;
  selected = -1;
  $("#work-panel").hidden = true;
  document.body.classList.remove("viewing");
}
function openDialog(id) {
  stop();
  modalOpen = true;
  document.getElementById(id).showModal();
}
for (const button of document.querySelectorAll("[data-open]")) {
  button.addEventListener("click", () => openDialog(button.dataset.open));
}
for (const button of document.querySelectorAll("[data-close]")) {
  button.addEventListener("click", () =>
    document.getElementById(button.dataset.close).close(),
  );
}
for (const dialog of document.querySelectorAll("dialog")) {
  dialog.addEventListener("close", () => {
    modalOpen = !!document.querySelector("dialog[open]");
    if (!modalOpen && entered) controls?.focus();
    invalidate();
  });
}
$("#help-open").addEventListener("click", () => openDialog("help"));
function updateMotion() {
  $("#motion-toggle").textContent = smooth
    ? "Movimento fluido"
    : "Spostamenti immediati";
  $("#motion-toggle").setAttribute("aria-pressed", String(smooth));
  if (!smooth && path.length) {
    Object.assign(player, path.at(-1));
    path = [];
    if (finalLook) {
      const look = orientation({ ...player, y: 1.7 }, finalLook);
      yaw = look.yaw;
      pitch = look.pitch;
      finalLook = null;
    }
    stream?.update(player, { selected, force: true });
    invalidate();
  }
}
$("#motion-toggle").addEventListener("click", () => {
  smooth = !smooth;
  try {
    localStorage.setItem("ua-motion", smooth ? "on" : "off");
  } catch {}
  updateMotion();
});
reduced.addEventListener("change", (e) => {
  smooth = !e.matches;
  updateMotion();
});
updateMotion();
function fail(message) {
  stop();
  entered = false;
  $("#loading-status").textContent = message;
  $("#fallback-open").hidden = !catalogue;
  document.body.classList.add("failed");
  document.body.classList.remove("exploring");
  $("#hud").hidden = true;
}
function setView() {
  camera.position.set(player.x, 1.7, player.z);
  camera.rotation.set(pitch, yaw, 0, "YXZ");
  camera.updateMatrixWorld();
}
function mapPoint(position) {
  return {
    x: 12 + ((position.x - BOUNDS.minX) / (BOUNDS.maxX - BOUNDS.minX)) * 116,
    y: 12 + ((BOUNDS.maxZ - position.z) / (BOUNDS.maxZ - BOUNDS.minZ)) * 300,
  };
}
function updateHud() {
  let nearest = null,
    nearestDistance = 12;
  for (const [index, art] of stream.values()) {
    const distance = Math.hypot(player.x - art.slot.x, player.z - art.slot.z);
    if (index === selected) {
      nearest = art;
      break;
    }
    if (distance < nearestDistance) {
      nearest = art;
      nearestDistance = distance;
    }
  }
  if (nearest !== detailArtwork) {
    detailArtwork?.setDetail(false);
    detailArtwork = nearest;
    nearest
      ?.setDetail(true)
      .then(invalidate)
      .catch(() => {
        announce(
          "Il dettaglio della foto non è disponibile. Apri la fotografia intera dal cartellino.",
        );
      });
  }
  const point = mapPoint(player);
  $("#map-player").setAttribute(
    "transform",
    `translate(${point.x} ${point.y}) rotate(${180 + (yaw * 180) / Math.PI})`,
  );
  const current = locateHall(player);
  if (current !== hallIndex) {
    hallIndex = current;
    $("#room-label").textContent =
      current < 0
        ? "PROMENADE / 10 SALE"
        : `${HALLS[current].title.toUpperCase()} / ${slots.filter((slot) => slot.hallIndex === current).length} OPERE ESPOSTE`;
    for (const button of document.querySelectorAll("[data-hall]"))
      button.setAttribute(
        "aria-current",
        String(Number(button.dataset.hall) === current),
      );
  }
}
function walkTo(destination, look = null) {
  controls?.stop();
  path = findPath(player, destination);
  finalLook = look;
  if (!path.length) {
    finalLook = null;
    announce("Scegli un punto libero nella sala.");
    return;
  }
  if (!smooth) {
    Object.assign(player, path.at(-1));
    path = [];
    if (look) {
      const angle = orientation({ ...player, y: 1.7 }, look);
      yaw = angle.yaw;
      pitch = angle.pitch;
      finalLook = null;
    }
    stream.update(player, { selected, force: true });
  }
  invalidate();
}
function visitHall(index) {
  if (!entered) return;
  clearSelection();
  const hall = HALLS[index];
  const first = slots.find(slot => slot.hallIndex === index) || hall.slots[0];
  walkTo(hall.entry, { x: first.x, y: 2.25, z: first.z });
  announce(`Percorso verso ${hall.title}.`);
}
$("#entrance").addEventListener("click", () => {
  clearSelection();
  walkTo(INITIAL, INITIAL_TARGET);
});
$("#next-room").addEventListener("click", () =>
  openDialog("floorplan"),
);

function buildMaps() {
  $("#map-art").replaceChildren();
  $("#hall-list").replaceChildren();
  const NS = "http://www.w3.org/2000/svg";
  for (const hall of HALLS) {
    const p1 = mapPoint({ x: hall.bounds.minX, z: hall.bounds.maxZ });
    const p2 = mapPoint({ x: hall.bounds.maxX, z: hall.bounds.minZ });
    const rect = document.createElementNS(NS, "rect");
    rect.setAttribute("x", p1.x);
    rect.setAttribute("y", p1.y);
    rect.setAttribute("width", p2.x - p1.x);
    rect.setAttribute("height", p2.y - p1.y);
    rect.setAttribute("class", "map-hall");
    $("#map-art").append(rect);
    const button = document.createElement("button");
    button.className = "hall-button";
    button.dataset.hall = hall.index;
    const name = document.createElement("strong");
    name.textContent = hall.title;
    const count = slots.filter((slot) => slot.hallIndex === hall.index).length;
    const detail = document.createElement("span");
    detail.textContent = count
      ? `${count} ${count === 1 ? "opera esposta" : "opere esposte"}`
      : "In allestimento · 20 posizioni";
    const mood = document.createElement("span");
    mood.textContent = hall.profile.mood;
    button.append(name, detail, mood);
    button.addEventListener("click", () => {
      $("#floorplan").close();
      visitHall(hall.index);
    });
    $("#hall-list").append(button);
  }
  for (const slot of slots) {
    const point = mapPoint(slot),
      dot = document.createElementNS(NS, "circle");
    dot.setAttribute("cx", point.x);
    dot.setAttribute("cy", point.y);
    dot.setAttribute("r", "1.6");
    dot.setAttribute("fill", "#333");
    $("#map-art").append(dot);
  }
}
function buildCollection() {
  $("#work-count").textContent = String(slots.length).padStart(2, "0");
  $("#collection-list").replaceChildren();
  slots.forEach((slot, index) => {
    const work = slot.work,
      button = document.createElement("button");
    button.className = "collection-work";
    const image = new Image();
    image.src = work.thumbnail || work.image;
    image.alt = work.alt || work.title;
    image.loading = "lazy";
    image.decoding = "async";
    const text = document.createElement("span");
    text.textContent = work.title;
    const subtitle = document.createElement("small");
    subtitle.textContent = `${collectionFor(work)?.title || "UnconventionArt"} / ${HALLS[slot.hallIndex].title}`;
    text.append(subtitle);
    const arrow = document.createElement("b");
    arrow.textContent = "↗";
    button.append(image, text, arrow);
    button.addEventListener("click", () => {
      $("#collection").close();
      if (entered) focusWork(index);
      else {
        selected = index;
        inspect();
      }
    });
    $("#collection-list").append(button);
  });
}
function mountArtwork(art, index) {
  if (disposed) {
    art.dispose();
    return;
  }
  scene.add(art.group);
  art.group.updateMatrixWorld(true);
  const button = document.createElement("button");
  button.className = "wall-plaque";
  button.hidden = true;
  button.setAttribute(
    "aria-label",
    `Leggi il cartellino: ${art.slot.work.title}`,
  );
  const title = document.createElement("strong");
  title.textContent = art.slot.work.title;
  const hint = document.createElement("span");
  hint.textContent = "Informazioni ↗";
  button.append(title, hint);
  button.addEventListener("click", () => describeWork(index));
  plaques.set(index, {
    button,
    position: art.label.getWorldPosition(new T.Vector3()),
  });
  $("#plaque-labels").append(button);
  lastHud = 0;
  invalidate();
}
function unmountArtwork(art, index) {
  scene?.remove(art.group);
  art.dispose();
  plaques.get(index)?.button.remove();
  plaques.delete(index);
}
function positionPlaques(time) {
  for (const [index, data] of plaques) {
    const art = stream.get(index);
    if (!art) continue;
    const distance = camera.position.distanceTo(data.position);
    const facing =
      direction.subVectors(camera.position, data.position).dot(art.normal) > 0;
    scratch.copy(data.position).project(camera);
    let visible =
      entered &&
      facing &&
      distance < 11 &&
      scratch.z > -1 &&
      scratch.z < 1 &&
      Math.abs(scratch.x) < 0.88 &&
      Math.abs(scratch.y) < 0.73;
    if (visible) {
      if (!data.occlusionAt || time - data.occlusionAt >= 100) {
        ray.set(
          camera.position,
          direction.subVectors(data.position, camera.position).normalize(),
        );
        ray.far = distance - 0.06;
        data.occluded =
          ray.intersectObjects(architecture.occluders, false).length > 0;
        data.occlusionAt = time;
      }
      visible = !data.occluded;
    }
    if (data.button.hidden === visible) data.button.hidden = !visible;
    if (visible)
      data.button.style.transform = `translate3d(${((scratch.x + 1) * viewport.width) / 2}px,${((1 - scratch.y) * viewport.height) / 2}px,0) translate(-50%,-50%)`;
  }
}
function describeWork(index) {
  const slot = slots[index];
  if (!slot) return;
  selected = index;
  const work = slot.work;
  $("#details-title").textContent = work.title;
  $("#details-series").textContent =
    collectionFor(work)?.title || "UnconventionArt";
  $("#details-credit").textContent = work.credit || "UnconventionArt";
  $("#details-description").textContent = work.description || work.alt || "";
  $("#details-metadata").replaceChildren();
  for (const [name, value] of [
    ["Tecnica", work.medium],
    ["Anno", work.year],
    ["Edizione", work.edition],
    ["Sala", HALLS[slot.hallIndex].title],
  ]) {
    if (!value) continue;
    const dt = document.createElement("dt"),
      dd = document.createElement("dd");
    dt.textContent = name;
    dd.textContent = value;
    $("#details-metadata").append(dt, dd);
  }
  openDialog("work-details");
}
function inspect() {
  const work = slots[selected]?.work;
  if (!work) return;
  $("#artwork-title").textContent = work.title;
  $("#artwork-series").textContent =
    collectionFor(work)?.title || "UnconventionArt";
  $("#artwork-image").src = work.image;
  $("#artwork-image").alt = work.alt || work.title;
  openDialog("artwork");
}
async function focusWork(index) {
  if (!slots.length) return;
  stop();
  selected = (index + slots.length) % slots.length;
  const intent = selected,
    slot = slots[intent];
  stream.update(player, { selected, force: true });
  announce(`Avvicinamento a ${slot.work.title}.`);
  const art = await stream.ensure(intent);
  if (selected !== intent || disposed) return;
  if (!art) {
    announce("L’immagine non è disponibile. Puoi riprovare dall’indice.");
    return;
  }
  const distance = viewingDistance(
    art.width,
    art.height,
    camera.aspect,
    camera.fov,
  );
  const right = new T.Vector3(
    Math.cos(slot.rotation),
    0,
    -Math.sin(slot.rotation),
  );
  const target = art.target.clone().addScaledVector(right, 0.35);
  const desired = target.clone().addScaledVector(art.normal, distance);
  const bounds = HALLS[slot.hallIndex].bounds;
  desired.x = T.MathUtils.clamp(
    desired.x,
    bounds.minX + 0.7,
    bounds.maxX - 0.7,
  );
  desired.z = T.MathUtils.clamp(
    desired.z,
    bounds.minZ + 0.7,
    bounds.maxZ - 0.7,
  );
  const position = safeViewpoint(desired);
  $("#work-title").textContent = slot.work.title;
  $("#work-series").textContent =
    collectionFor(slot.work)?.title || "UnconventionArt";
  $("#work-credit").textContent = slot.work.credit || "";
  $("#work-panel").hidden = false;
  document.body.classList.add("viewing");
  walkTo(position, target);
}
$("#details-inspect").addEventListener("click", () => {
  $("#work-details").close();
  inspect();
});
$("#inspect-work").addEventListener("click", inspect);
$("#describe-work").addEventListener("click", () => describeWork(selected));
$("#artwork-details").addEventListener("click", () => {
  $("#artwork").close();
  describeWork(selected);
});
$("#leave-work").addEventListener("click", () => {
  stop();
  clearSelection();
  controls?.focus();
  invalidate();
});
$("#next-work").addEventListener("click", () => focusWork(selected + 1));
$("#previous-work").addEventListener("click", () =>
  focusWork(selected < 0 ? slots.length - 1 : selected - 1),
);

function tap(event) {
  if (!entered || modalOpen) return;
  pointerCoords.set(
    (event.clientX / viewport.width) * 2 - 1,
    1 - (event.clientY / viewport.height) * 2,
  );
  ray.far = 190;
  ray.setFromCamera(pointerCoords, camera);
  const targets = [
    ...architecture.occluders,
    ...stream.values().flatMap(([, art]) => [art.photograph, art.label]),
  ];
  const hit = ray.intersectObjects(targets, false)[0];
  if (!hit) return;
  if (hit.object.userData.dialog) {
    openDialog(hit.object.userData.dialog);
    return;
  }
  const work = hit.object.userData.work;
  if (work) {
    const index = slots.findIndex((slot) => slot.work.id === work.id);
    if (hit.object.userData.isPlaque) describeWork(index);
    else focusWork(index);
  } else if (
    hit.object.userData.walkable ||
    hit.object === architecture.floor
  ) {
    clearSelection();
    walkTo(hit.point);
  }
}
function render(time) {
  frame = 0;
  if (disposed || document.hidden) {
    lastTime = 0;
    return;
  }
  const rawDelta = Math.max(1, time - lastTime);
  lastTime = time;
  const delta = Math.min(0.05, rawDelta / 1000);
  let moving = false;
  if (entered && !modalOpen) {
    const input = controls.sample(delta);
    if (input.active) moving = true;
    const walking = Math.abs(input.forward) + Math.abs(input.sideways) > 0.0001;
    const looking = Math.abs(input.lookX) + Math.abs(input.lookY) > 0.00001;
    if (walking || looking) {
      path = [];
      finalLook = null;
      clearSelection();
      yaw -= input.lookX;
      pitch = T.MathUtils.clamp(pitch - input.lookY, -0.9, 0.85);
      if (walking)
        Object.assign(
          player,
          moveWithCollision(
            player,
            (-Math.sin(yaw) * input.forward + Math.cos(yaw) * input.sideways) *
              delta *
              3.8,
            (-Math.cos(yaw) * input.forward - Math.sin(yaw) * input.sideways) *
              delta *
              3.8,
          ),
        );
    } else if (path.length) {
      const next = path[0],
        dx = next.x - player.x,
        dz = next.z - player.z,
        distance = Math.hypot(dx, dz);
      const step = delta * (path.length > 1 || distance > 12 ? 6.2 : 3.8);
      if (distance <= step) {
        Object.assign(player, next);
        path.shift();
      } else
        Object.assign(
          player,
          moveWithCollision(
            player,
            (dx / distance) * step,
            (dz / distance) * step,
          ),
        );
      // On long routes face the route; turn toward the photograph only on arrival.
      const look = path.length > 1 ? { ...next, y: 1.7 } : finalLook;
      if (look) turnToward(look, delta);
      moving = true;
    } else if (finalLook) {
      const remaining = turnToward(finalLook, delta);
      if (remaining < 0.001) finalLook = null;
      moving = true;
    }
    if (time - lastStream > 650) {
      stream.update(player, { selected });
      lastStream = time;
    }
  }
  // Recover Retina detail when standing still; keep motion at its cheaper
  // adaptive resolution rather than permanently leaving the scene blurred.
  const desiredPixelRatio = moving
    ? movementPixelRatio
    : Math.min(devicePixelRatio, 2);
  if (Math.abs(renderer.getPixelRatio() - desiredPixelRatio) > 0.01) {
    renderer.setPixelRatio(desiredPixelRatio);
  }
  setView();
  renderer.render(scene, camera);
  positionPlaques(time);
  if (!moving || time - lastHud > 80) {
    updateHud();
    lastHud = time;
  }
  // Adapt only after sustained movement; never chase individual frame spikes.
  if (mobile && moving && rawDelta < 100) {
    frameAverage += (rawDelta - frameAverage) * 0.03;
    if (
      ++qualityFrames > 150 &&
      frameAverage > 27 &&
      movementPixelRatio > 1
    ) {
      movementPixelRatio = Math.max(1, movementPixelRatio - 0.1);
      qualityFrames = 0;
    }
  }
  if (moving) invalidate();
  else lastTime = 0;
}
function turnToward(target, delta) {
  const desired = orientation({ ...player, y: 1.7 }, target);
  const difference = shortestAngle(yaw, desired.yaw),
    blend = 1 - Math.exp(-delta * 5);
  yaw += difference * blend;
  pitch += (desired.pitch - pitch) * blend;
  return Math.abs(difference) + Math.abs(desired.pitch - pitch);
}
function resize() {
  if (!renderer || !camera) return;
  const bounds = root.getBoundingClientRect();
  viewport = { width: bounds.width, height: bounds.height };
  camera.aspect = bounds.width / bounds.height;
  camera.updateProjectionMatrix();
  renderer.setSize(bounds.width, bounds.height, false);
  lastHud = 0;
  invalidate();
}
addEventListener("resize", resize);
window.visualViewport?.addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => {
  stop();
  if (document.hidden) {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  } else invalidate();
});
addEventListener("pagehide", (event) => {
  stop();
  if (event.persisted) return;
  disposed = true;
  cancelAnimationFrame(frame);
  controls?.dispose();
  stream?.dispose();
  architecture?.dispose();
  renderer?.dispose();
});
addEventListener("pageshow", (event) => {
  if (event.persisted) invalidate();
});

try {
  catalogue = await loadCatalogue({ publicOnly: true });
  if (catalogue.works.length > CAPACITY)
    throw new Error(
      `Il catalogo supera le ${CAPACITY} postazioni disponibili.`,
    );
  slots = layoutWorks(catalogue.works);
  buildCollection();
  buildMaps();
  renderer = new T.WebGLRenderer({
    // Smooth the high-contrast photograph silhouettes on touch displays too.
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(movementPixelRatio);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  scene = new T.Scene();
  scene.background = new T.Color(0xffffff);
  scene.fog = new T.Fog(0xffffff, 75, 180);
  camera = new T.PerspectiveCamera(
    mobile ? 70 : 60,
    innerWidth / innerHeight,
    0.08,
    200,
  );
  root.append(renderer.domElement);
  architecture = createArchitecture(scene, renderer, { mobile, onReady: invalidate, occupiedSlots: slots });
  stream = createArtStream({
    slots,
    limit: mobile ? 24 : 48,
    concurrency: 2,
    load: (slot) => createArtwork(slot, renderer, { mobile }),
    mount: mountArtwork,
    unmount: unmountArtwork,
    onError: () =>
      announce("Una fotografia non è disponibile. La visita può continuare."),
  });
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute(
    "aria-label",
    "Galleria 3D: trascina per guardare, WASD o frecce per camminare. Da telefono usa il joystick.",
  );
  controls = createControls({
    canvas,
    joystickElement: $("#joystick"),
    knobElement: $("#joystick-knob"),
    isEnabled: () => entered && !modalOpen && !disposed,
    onTap: tap,
    onActivity: (event) => {
      if (event.kind === "move" || event.kind === "look") {
        path = [];
        finalLook = null;
        clearSelection();
      }
      invalidate();
    },
    onKeyboardAction: (action) => {
      if (action === "escape") {
        stop();
        clearSelection();
      }
    },
    onWheel: (event) => {
      clearSelection();
      const sign = Math.sign(event.deltaY);
      walkTo(
        moveWithCollision(
          player,
          -Math.sin(yaw) * sign * 2.2,
          -Math.cos(yaw) * sign * 2.2,
        ),
      );
    },
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    fail(
      "La connessione grafica si è interrotta. Ricarica la pagina per riprovare.",
    );
  });
  stream.update(player, { force: true });
  entered = true;
  $("#hud").hidden = false;
  $("#next-room").hidden = false;
  $("#previous-work").disabled = slots.length < 2;
  $("#next-work").disabled = !slots.length;
  $("#next-work").innerHTML = slots.length > 1 ? 'Opera successiva <span>→</span>' : 'Scopri l’opera <span>↗</span>';
  document.body.classList.add("exploring");
  $("#loading-status").textContent = "";
  if (!mobile && !modalOpen) controls.focus();
  resize();
  invalidate();
} catch (error) {
  fail(error.message || "Il dispositivo non supporta la visita 3D.");
}
