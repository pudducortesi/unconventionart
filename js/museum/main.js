import * as T from "../../vendor/three.module.js";
import { loadCatalogue } from "../catalogue.js";
import { createArchitecture, createArtwork } from "./architecture.js";
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
  status = $("#loading-status");
const coarse = matchMedia("(pointer:coarse)");
const joystick = { x: 0, y: 0, id: null };
const media = matchMedia("(prefers-reduced-motion: reduce)");
let smooth = !media.matches,
  entered = false,
  renderer,
  scene,
  camera,
  architecture;
let catalogue,
  rooms = [],
  roomIndex = 0,
  artworks = [],
  selected = -1,
  loadingRoom = false;
let yaw = 0,
  pitch = 0,
  path = [],
  finalLook = null,
  keys = new Set(),
  pointer = null;
let frame = 0,
  lastTime = 0,
  disposed = false,
  roomGeneration = 0;
const player = { x: -1.8, z: 6.7 };
const plaqueButtons = new Map();
const initial = { x: -1.8, y: 1.7, z: 6.7 };
const initialTarget = { x: 1, y: 1.7, z: -3.4 };
let introLook = orientation(initial, initialTarget);
yaw = introLook.yaw;
pitch = introLook.pitch;
try {
  if (localStorage.getItem("ua-motion") === "off") smooth = false;
} catch {}
function announce(text) {
  $("#announcement").textContent = text;
}
function updateMotion() {
  if (!smooth && path.length) {
    Object.assign(player, path.at(-1));
    path = [];
    if (finalLook) {
      const target = orientation(
        { x: player.x, y: 1.7, z: player.z },
        finalLook,
      );
      yaw = target.yaw;
      pitch = target.pitch;
      finalLook = null;
    }
    if (renderer) invalidate();
  }
  $("#motion-toggle").textContent = smooth
    ? "Movimento fluido"
    : "Spostamenti immediati";
  $("#motion-toggle").setAttribute("aria-pressed", String(smooth));
}
$("#motion-toggle").addEventListener("click", () => {
  smooth = !smooth;
  try {
    localStorage.setItem("ua-motion", smooth ? "on" : "off");
  } catch {}
  updateMotion();
});
media.addEventListener("change", (event) => {
  smooth = !event.matches;
  updateMotion();
});
updateMotion();
function stop() {
  if (pointer && renderer?.domElement.hasPointerCapture(pointer.id))
    renderer.domElement.releasePointerCapture(pointer.id);
  pointer = null;
  keys.clear();
  path = [];
  finalLook = null;
  resetJoystick();
}
function resetJoystick() {
  joystick.x = joystick.y = 0;
  if (joystick.id !== null && $("#joystick").hasPointerCapture(joystick.id))
    $("#joystick").releasePointerCapture(joystick.id);
  joystick.id = null;
  $("#joystick-knob").style.transform = "";
}
function dialogOpen() {
  return !!document.querySelector("dialog[open]");
}
document.querySelectorAll("[data-open]").forEach((button) =>
  button.addEventListener("click", () => {
    stop();
    document.getElementById(button.dataset.open).showModal();
  }),
);
$("#help-open").addEventListener("click", () => {
  stop();
  $("#help").showModal();
});
document
  .querySelectorAll("[data-close]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      document.getElementById(button.dataset.close).close(),
    ),
  );
document.querySelectorAll("dialog").forEach((dialog) =>
  dialog.addEventListener("close", () => {
    if (!dialogOpen() && entered)
      renderer?.domElement.focus({ preventScroll: true });
    if (renderer) invalidate();
  }),
);
function fail(message) {
  stop();
  status.textContent = message;
  document.body.classList.add("failed");
  $("#fallback-open").hidden = !catalogue;
  document.body.classList.remove("exploring");
  $("#hud").hidden = true;
  entered = false;
}
function invalidate() {
  if (renderer && camera && !frame && !disposed && !document.hidden)
    frame = requestAnimationFrame(render);
}
function setView() {
  camera.position.set(player.x, 1.7, player.z);
  camera.rotation.order = "YXZ";
  camera.rotation.set(pitch, yaw, 0, "YXZ");
  const x = 12 + ((player.x + 7) / 14) * 116,
    y = 12 + ((player.z + 9) / 18) * 156;
  $("#map-player").setAttribute(
    "transform",
    `translate(${x} ${y}) rotate(${(-yaw * 180) / Math.PI})`,
  );
}
function clearSelection() {
  selected = -1;
  $("#work-panel").hidden = true;
  document.body.classList.remove("viewing");
}
function walkTo(destination, look = null) {
  resetJoystick();
  keys.clear();
  path = findPath(player, destination);
  finalLook = look;
  if (!path.length) return;
  if (!smooth) {
    const end = path.at(-1);
    player.x = end.x;
    player.z = end.z;
    path = [];
    if (look) {
      const angle = orientation({ x: player.x, y: 1.7, z: player.z }, look);
      yaw = angle.yaw;
      pitch = angle.pitch;
      finalLook = null;
    }
  }
  invalidate();
}
function focusPosition(art) {
  const distance = viewingDistance(
    art.width,
    art.height,
    camera.aspect,
    camera.fov,
  );
  const right = new T.Vector3(
    Math.cos(art.slot.rotation),
    0,
    -Math.sin(art.slot.rotation),
  );
  const target = art.target.clone().addScaledVector(right, 0.35);
  const position = target.clone().addScaledVector(art.normal, distance);
  Object.assign(position, safeViewpoint(position));
  position.y = 1.7;
  return { position, target };
}
const plaqueRay = new T.Raycaster();
function positionPlaques() {
  if (!entered) return;
  camera.updateMatrixWorld();
  scene.updateMatrixWorld();
  const rect = root.getBoundingClientRect();
  for (const art of artworks) {
    const button = plaqueButtons.get(art.slot.work.id);
    if (!button) continue;
    const world = art.label.getWorldPosition(new T.Vector3());
    const facing =
      new T.Vector3().subVectors(camera.position, world).dot(art.normal) > 0;
    const projected = world.clone().project(camera);
    const distance = camera.position.distanceTo(world);
    plaqueRay.set(
      camera.position,
      world.clone().sub(camera.position).normalize(),
    );
    plaqueRay.far = Math.max(0, distance - 0.06);
    const blocked =
      plaqueRay.intersectObjects(architecture.occluders, false).length > 0;
    const visible =
      facing &&
      !blocked &&
      projected.z > -1 &&
      projected.z < 1 &&
      Math.abs(projected.x) < 0.92 &&
      Math.abs(projected.y) < 0.72 &&
      distance < 10;
    button.hidden = !visible;
    if (visible) {
      button.style.left = `${((projected.x + 1) * rect.width) / 2}px`;
      button.style.top = `${((1 - projected.y) * rect.height) / 2}px`;
    }
  }
}
function describeWork(index) {
  if (!artworks[index]) return;
  selected = index;
  stop();
  const work = artworks[index].slot.work;
  $("#details-title").textContent = work.title;
  $("#details-series").textContent = rooms[roomIndex].collection.title;
  $("#details-credit").textContent = work.credit || "UnconventionArt";
  $("#details-description").textContent =
    work.description || work.alt || rooms[roomIndex].collection.description;
  $("#details-metadata").replaceChildren();
  for (const [label, value] of [
    ["Tecnica", work.medium],
    ["Anno", work.year],
    ["Edizione", work.edition],
  ]) {
    if (!value) continue;
    const dt = document.createElement("dt"),
      dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    $("#details-metadata").append(dt, dd);
  }
  $("#work-details").showModal();
}
$("#details-inspect").addEventListener("click", () => {
  $("#work-details").close();
  inspect();
});
function focusWork(index) {
  if (!artworks.length || loadingRoom) return;
  selected = (index + artworks.length) % artworks.length;
  const art = artworks[selected];
  $("#work-title").textContent = art.slot.work.title;
  $("#work-credit").textContent = art.slot.work.credit || "";
  $("#work-series").textContent = rooms[roomIndex].collection.title;
  $("#work-panel").hidden = false;
  document.body.classList.add("viewing");
  $("#next-work").firstChild.textContent =
    artworks.length > 1 ? "Opera successiva " : "Torna all’opera ";
  announce(`Avvicinamento a ${art.slot.work.title}.`);
  const framing = focusPosition(art);
  walkTo(framing.position, framing.target);
}
function inspect() {
  const art = artworks[selected];
  if (!art) return;
  stop();
  $("#artwork-title").textContent = art.slot.work.title;
  $("#artwork-series").textContent = rooms[roomIndex].collection.title;
  $("#artwork-image").src = art.slot.work.image;
  $("#artwork-image").alt = art.slot.work.alt || art.slot.work.title;
  $("#artwork-details").hidden = false;
  $("#artwork").showModal();
}
$("#inspect-work").addEventListener("click", inspect);
$("#describe-work").addEventListener("click", () => describeWork(selected));
$("#artwork-details").addEventListener("click", () => {
  $("#artwork").close();
  describeWork(selected);
});
$("#leave-work").addEventListener("click", () => {
  clearSelection();
  stop();
  invalidate();
  root.querySelector("canvas")?.focus();
});
$("#next-work").addEventListener("click", () => focusWork(selected + 1));
$("#previous-work").addEventListener("click", () =>
  focusWork(selected < 0 ? artworks.length - 1 : selected - 1),
);
$("#entrance").addEventListener("click", () => {
  clearSelection();
  walkTo(initial, initialTarget);
});
$("#next-room").addEventListener("click", () =>
  loadRoom((roomIndex + 1) % rooms.length).catch((error) =>
    fail(error.message),
  ),
);
async function loadRoom(index) {
  const generation = ++roomGeneration;
  loadingRoom = true;
  stop();
  clearSelection();
  $("#next-room").disabled = true;
  $("#next-work").disabled = true;
  $("#previous-work").disabled = true;
  for (const art of artworks) {
    scene.remove(art.group);
    art.dispose();
  }
  artworks = [];
  plaqueButtons.clear();
  $("#plaque-labels").replaceChildren();
  roomIndex = index;
  const room = rooms[index];
  const loaded = await Promise.allSettled(
    layoutWorks(room.works).map((slot) => createArtwork(slot, renderer)),
  );
  if (disposed || generation !== roomGeneration) {
    for (const r of loaded) if (r.status === "fulfilled") r.value.dispose();
    return;
  }
  const failed = loaded.filter((r) => r.status === "rejected").length;
  artworks = loaded.filter((r) => r.status === "fulfilled").map((r) => r.value);
  artworks.forEach((art, index) => {
    scene.add(art.group);
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
    plaqueButtons.set(art.slot.work.id, button);
    $("#plaque-labels").append(button);
  });
  if (!artworks.length)
    throw new Error("Non è stato possibile caricare le fotografie.");
  $("#room-label").textContent =
    `SALA ${String(index + 1).padStart(2, "0")} / ${room.collection.title.toUpperCase()}`;
  $("#next-room").hidden = rooms.length < 2;
  $("#next-room").disabled = false;
  $("#next-work").disabled = false;
  $("#previous-work").disabled = artworks.length < 2;
  $("#map-art").replaceChildren();
  for (const art of artworks) {
    const dot = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    dot.setAttribute("cx", 12 + ((art.slot.x + 7) / 14) * 116);
    dot.setAttribute("cy", 12 + ((art.slot.z + 9) / 18) * 156);
    dot.setAttribute("r", "2.5");
    dot.setAttribute("fill", "#454545");
    $("#map-art").append(dot);
  }
  player.x = initial.x;
  player.z = initial.z;
  yaw = introLook.yaw;
  pitch = introLook.pitch;
  loadingRoom = false;
  invalidate();
  announce(
    `${room.collection.title}, ${artworks.length} opere.${failed ? " Alcune immagini non sono disponibili." : ""}`,
  );
}
function buildCollection() {
  $("#work-count").textContent = String(catalogue.works.length).padStart(
    2,
    "0",
  );
  $("#collection-list").replaceChildren();
  for (const [roomNumber, room] of rooms.entries())
    for (const work of room.works) {
      const button = document.createElement("button");
      button.className = "collection-work";
      const image = new Image();
      image.src = work.image;
      image.alt = work.alt || work.title;
      image.loading = "lazy";
      const text = document.createElement("span");
      text.textContent = work.title;
      const small = document.createElement("small");
      small.textContent = `${room.collection.title} / Sala ${String(roomNumber + 1).padStart(2, "0")}`;
      text.append(small);
      const arrow = document.createElement("b");
      arrow.textContent = "↗";
      button.append(image, text, arrow);
      button.addEventListener("click", async () => {
        if (!renderer || !entered) {
          showFlatWork(work, room.collection);
          return;
        }
        $("#collection").close();
        try {
          if (roomIndex !== roomNumber) await loadRoom(roomNumber);
          const index = artworks.findIndex(
            (art) => art.slot.work.id === work.id,
          );
          if (index >= 0) focusWork(index);
          else announce("Questa fotografia non è disponibile.");
        } catch (error) {
          fail(error.message);
        }
      });
      $("#collection-list").append(button);
    }
}
function showFlatWork(work, collection) {
  $("#collection").close();
  $("#artwork-title").textContent = work.title;
  $("#artwork-series").textContent = collection.title;
  $("#artwork-image").src = work.image;
  $("#artwork-image").alt = work.alt || work.title;
  $("#artwork-details").hidden = true;
  $("#artwork").showModal();
}
function render(time) {
  frame = 0;
  if (disposed || document.hidden) return;
  const delta = Math.min(0.045, Math.max(0.001, (time - lastTime) / 1000));
  lastTime = time;
  let moving = false;
  if (entered && !dialogOpen() && !loadingRoom) {
    if (keys.size || Math.abs(joystick.x) + Math.abs(joystick.y) > 0.01) {
      path = [];
      finalLook = null;
      clearSelection();
      let forward =
        Number(keys.has("forward")) - Number(keys.has("back")) - joystick.y;
      let sideways =
        Number(keys.has("right")) - Number(keys.has("left")) + joystick.x;
      const length = Math.max(1, Math.hypot(forward, sideways));
      forward /= length;
      sideways /= length;
      const dx =
        (-Math.sin(yaw) * forward + Math.cos(yaw) * sideways) * delta * 2.6;
      const dz =
        (-Math.cos(yaw) * forward - Math.sin(yaw) * sideways) * delta * 2.6;
      Object.assign(player, moveWithCollision(player, dx, dz));
      moving = true;
    } else if (path.length) {
      const next = path[0],
        dx = next.x - player.x,
        dz = next.z - player.z,
        distance = Math.hypot(dx, dz),
        step = delta * 3.4;
      if (distance < step) {
        player.x = next.x;
        player.z = next.z;
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
      moving = true;
    }
    if (finalLook) {
      const desired = orientation(
        { x: player.x, y: 1.7, z: player.z },
        finalLook,
      );
      const blend = smooth ? 1 - Math.exp(-delta * 3.7) : 1;
      const difference = shortestAngle(yaw, desired.yaw);
      yaw += difference * blend;
      pitch += (desired.pitch - pitch) * blend;
      if (
        !path.length &&
        Math.abs(difference) < 0.001 &&
        Math.abs(desired.pitch - pitch) < 0.001
      )
        finalLook = null;
      moving = true;
    }
  }
  setView();
  renderer.render(scene, camera);
  positionPlaques();
  if (moving) invalidate();
}
function attachControls() {
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute(
    "aria-label",
    "Galleria 3D. Trascina per guardare, clicca a terra per muoverti. Usa WASD o le frecce.",
  );
  const raycaster = new T.Raycaster(),
    coords = new T.Vector2();
  const marker = new T.Mesh(
    new T.RingGeometry(0.17, 0.195, 40),
    new T.MeshBasicMaterial({
      color: 0x686868,
      transparent: true,
      opacity: 0.8,
      side: T.DoubleSide,
      depthWrite: false,
    }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  scene.add(marker);
  function hit(event) {
    const rect = canvas.getBoundingClientRect();
    coords.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(coords, camera);
    const target = raycaster.intersectObjects(
      [
        ...architecture.occluders,
        ...artworks.flatMap((art) => [art.photograph, art.label]),
      ],
      false,
    )[0];
    return target &&
      (target.object.userData.walkable || target.object.userData.work)
      ? target
      : null;
  }
  canvas.addEventListener("pointerdown", (event) => {
    if (
      !entered ||
      dialogOpen() ||
      loadingRoom ||
      event.button !== 0 ||
      pointer
    )
      return;
    canvas.focus({ preventScroll: true });
    // Looking and walking can happen together with two fingers.
    path = [];
    finalLook = null;
    pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      dragged: false,
    };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!entered || dialogOpen()) return;
    if (pointer && pointer.id === event.pointerId) {
      const dx = event.clientX - pointer.x,
        dy = event.clientY - pointer.y;
      if (
        Math.hypot(
          event.clientX - pointer.startX,
          event.clientY - pointer.startY,
        ) > 5
      )
        pointer.dragged = true;
      if (pointer.dragged) {
        clearSelection();
        yaw -= dx * (event.pointerType === "touch" ? 0.0025 : 0.0035);
        pitch = Math.max(
          -0.9,
          Math.min(
            0.85,
            pitch - dy * (event.pointerType === "touch" ? 0.0025 : 0.0035),
          ),
        );
        $("#point-label").hidden = true;
        marker.visible = false;
      }
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      invalidate();
      return;
    }
    if (event.pointerType === "touch") return;
    const target = hit(event),
      work = target?.object.userData.work;
    canvas.classList.toggle("over-art", !!work);
    $("#point-label").hidden = !work;
    if (work) $("#point-title").textContent = work.title;
    marker.visible = !!target && !work;
    if (marker.visible) {
      marker.position.copy(target.point);
      marker.position.y = 0.015;
    }
    invalidate();
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dragged = pointer.dragged;
    pointer = null;
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
    if (dragged || dialogOpen() || !entered || loadingRoom) return;
    const target = hit(event);
    if (!target) return;
    const work = target.object.userData.work;
    if (work) {
      const index = artworks.findIndex((art) => art.slot.work.id === work.id);
      if (target.object.userData.isPlaque) describeWork(index);
      else focusWork(index);
    } else {
      clearSelection();
      walkTo(target.point);
    }
  });
  canvas.addEventListener("pointercancel", () => {
    pointer = null;
  });
  canvas.addEventListener("lostpointercapture", () => {
    pointer = null;
  });
  canvas.addEventListener("pointerleave", () => {
    $("#point-label").hidden = true;
    marker.visible = false;
    invalidate();
  });
  canvas.addEventListener(
    "wheel",
    (event) => {
      if (!entered || dialogOpen()) return;
      event.preventDefault();
      clearSelection();
      const direction = Math.sign(event.deltaY);
      const target = moveWithCollision(
        player,
        -Math.sin(yaw) * direction * 1.3,
        -Math.cos(yaw) * direction * 1.3,
      );
      walkTo(target);
    },
    { passive: false },
  );
  const mapping = {
    KeyW: "forward",
    ArrowUp: "forward",
    KeyS: "back",
    ArrowDown: "back",
    KeyA: "left",
    ArrowLeft: "left",
    KeyD: "right",
    ArrowRight: "right",
  };
  // Keyboard movement is scoped to the canvas; buttons retain native behaviour.
  canvas.addEventListener("keydown", (event) => {
    if (!entered || dialogOpen()) return;
    if (mapping[event.code]) {
      event.preventDefault();
      keys.add(mapping[event.code]);
      invalidate();
    }
    if (event.code === "Escape") {
      stop();
      clearSelection();
    }
  });
  addEventListener("keyup", (event) => {
    if (mapping[event.code]) keys.delete(mapping[event.code]);
  });
  addEventListener("blur", () => {
    stop();
    pointer = null;
  });
  const stick = $("#joystick");
  const updateStick = (event) => {
    const rect = stick.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    const radius = 34,
      length = Math.hypot(dx, dy),
      ratio = Math.min(1, radius / (length || 1));
    joystick.x = length < 5 ? 0 : (dx * ratio) / radius;
    joystick.y = length < 5 ? 0 : (dy * ratio) / radius;
    $("#joystick-knob").style.transform =
      `translate(${dx * ratio}px, ${dy * ratio}px)`;
    invalidate();
  };
  stick.addEventListener("pointerdown", (event) => {
    if (dialogOpen() || !entered || joystick.id !== null) return;
    event.preventDefault();
    path = [];
    finalLook = null;
    clearSelection();
    joystick.id = event.pointerId;
    stick.setPointerCapture(event.pointerId);
    updateStick(event);
  });
  stick.addEventListener("pointermove", (event) => {
    if (event.pointerId === joystick.id) updateStick(event);
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
    stick.addEventListener(name, (event) => {
      if (event.pointerId === joystick.id) resetJoystick();
    });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    fail(
      "La connessione grafica si è interrotta. Ricarica la pagina per riprovare.",
    );
  });
}
function resize() {
  if (!renderer) return;
  const rect = root.getBoundingClientRect();
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
  renderer.setSize(rect.width, rect.height);
  invalidate();
}
addEventListener("resize", resize);
window.visualViewport?.addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => {
  stop();
  if (document.hidden && frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  } else invalidate();
});
addEventListener("pagehide", (event) => {
  if (event.persisted) {
    stop();
    return;
  }
  disposed = true;
  cancelAnimationFrame(frame);
  artworks.forEach((art) => art.dispose());
  architecture?.dispose();
  renderer?.dispose();
});
addEventListener("pageshow", (event) => {
  if (event.persisted) invalidate();
});
try {
  catalogue = await loadCatalogue({ publicOnly: true });
  for (const collection of catalogue.collections) {
    const works = catalogue.works.filter(
      (work) => work.collection === collection.id,
    );
    for (let i = 0; i < works.length; i += 8)
      rooms.push({ collection, works: works.slice(i, i + 8) });
  }
  if (!rooms.length) throw new Error("Il catalogo fotografico è vuoto.");
  buildCollection();
  renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "default",
  });
  renderer.setPixelRatio(
    Math.min(
      devicePixelRatio,
      matchMedia("(pointer:coarse)").matches ? 1.25 : 1.5,
    ),
  );
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  scene = new T.Scene();
  scene.background = new T.Color(0xffffff);
  scene.fog = null;
  camera = new T.PerspectiveCamera(
    coarse.matches ? 70 : 60,
    innerWidth / innerHeight,
    0.05,
    70,
  );
  root.append(renderer.domElement);
  architecture = createArchitecture(scene, renderer);
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  setView();
  renderer.render(scene, camera);
  await loadRoom(0);
  attachControls();
  status.textContent = "";
  entered = true;
  document.body.classList.add("exploring");
  $("#hud").hidden = false;
  if (!coarse.matches) renderer.domElement.focus({ preventScroll: true });
  resize();
  invalidate();
} catch (error) {
  fail(
    error.message || "Il tuo dispositivo non supporta questa esperienza 3D.",
  );
}
