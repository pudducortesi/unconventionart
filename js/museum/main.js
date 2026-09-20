import * as T from "../../vendor/three.module.js";
import { loadCatalogue } from "../catalogue.js";
import { createArchitecture, createArtwork } from "./architecture.js";
import {
  moveWithCollision,
  orientation,
  shortestAngle,
  layoutWorks,
  findPath,
} from "./navigation.js";
const $ = (selector) => document.querySelector(selector);
const root = $("#scene"),
  status = $("#loading-status"),
  entry = $("#enter");
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
const player = { x: -2.8, z: 5.8 };
const initial = { x: -2.8, y: 1.7, z: 5.8 };
let introLook = orientation(initial, { x: 0, y: 2.8, z: -8.6 });
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
      const target = orientation({ x: player.x, y: 1.7, z: player.z }, finalLook);
      yaw = target.yaw; pitch = target.pitch; finalLook = null;
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
  keys.clear();
  path = [];
  finalLook = null;
}
function dialogOpen() {
  return !!document.querySelector("dialog[open]");
}
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
    invalidate();
  }),
);
function fail(message) {
  stop();
  entry.disabled = true;
  entry.textContent = "La sala 3D non è disponibile";
  status.textContent = message + " Puoi aprire il catalogo fotografico.";
  document.body.classList.remove("exploring");
  $("#hud").hidden = true;
  entered = false;
}
function invalidate() {
  if (!frame && !disposed && !document.hidden)
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
  walkTo(art.focus, art.target);
}
function inspect() {
  const art = artworks[selected];
  if (!art) return;
  stop();
  $("#artwork-title").textContent = art.slot.work.title;
  $("#artwork-series").textContent = rooms[roomIndex].collection.title;
  $("#artwork-image").src = art.slot.work.image;
  $("#artwork-image").alt = art.slot.work.alt || art.slot.work.title;
  $("#artwork-contact").href =
    `contact.html?work=${encodeURIComponent(art.slot.work.title)}`;
  $("#artwork").showModal();
}
$("#inspect-work").addEventListener("click", inspect);
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
  walkTo(initial, { x: 0, y: 2.8, z: -8.6 });
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
  artworks.forEach((art) => scene.add(art.group));
  if (!artworks.length)
    throw new Error("Non è stato possibile caricare le fotografie.");
  $("#exhibition-name").textContent = room.collection.title;
  $("#exhibition-count").textContent =
    `${artworks.length} ${artworks.length === 1 ? "opera esposta" : "opere esposte"} / visita libera`;
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
    dot.setAttribute("fill", "#cab58c");
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
entry.addEventListener("click", () => {
  if (!renderer || loadingRoom) return;
  entered = true;
  document.body.classList.add("exploring");
  $("#hud").hidden = false;
  renderer.domElement.focus({ preventScroll: true });
  invalidate();
  announce(
    "Sei nella galleria. Trascina per guardarti intorno e clicca sul pavimento per camminare.",
  );
});
function render(time) {
  frame = 0;
  if (disposed || document.hidden) return;
  const delta = Math.min(0.045, Math.max(0.001, (time - lastTime) / 1000));
  lastTime = time;
  let moving = false;
  if (entered && !dialogOpen() && !loadingRoom) {
    if (keys.size) {
      path = [];
      finalLook = null;
      clearSelection();
      let forward = Number(keys.has("forward")) - Number(keys.has("back"));
      let sideways = Number(keys.has("right")) - Number(keys.has("left"));
      const length = Math.hypot(forward, sideways) || 1;
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
      color: 0xd5c09b,
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
    return raycaster.intersectObjects(
      [architecture.floor, ...artworks.map((art) => art.photograph)],
      false,
    )[0];
  }
  canvas.addEventListener("pointerdown", (event) => {
    if (!entered || dialogOpen() || event.button !== 0 || pointer) return;
    canvas.focus({ preventScroll: true });
    stop();
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
        yaw -= dx * 0.0035;
        pitch = Math.max(-0.9, Math.min(0.85, pitch - dy * 0.0035));
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
    if (dragged) return;
    const target = hit(event);
    if (!target) return;
    const work = target.object.userData.work;
    if (work)
      focusWork(artworks.findIndex((art) => art.slot.work.id === work.id));
    else {
      clearSelection();
      walkTo(target.point);
    }
  });
  canvas.addEventListener("pointercancel", () => {
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
  document.querySelectorAll("[data-move]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      if (dialogOpen()) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      keys.add(button.dataset.move);
      invalidate();
    });
    const release = () => keys.delete(button.dataset.move);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("click", (event) => {
      if (event.detail === 0) {
        const direction = button.dataset.move;
        const forward =
            direction === "forward" ? 1 : direction === "back" ? -1 : 0,
          side = direction === "right" ? 1 : direction === "left" ? -1 : 0;
        walkTo(
          moveWithCollision(
            player,
            -Math.sin(yaw) * forward + Math.cos(yaw) * side,
            -Math.cos(yaw) * forward - Math.sin(yaw) * side,
          ),
        );
      }
    });
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
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  invalidate();
}
addEventListener("resize", resize);
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
  renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "default",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  scene = new T.Scene();
  scene.background = new T.Color(0x262d26);
  scene.fog = new T.FogExp2(0x262d26, 0.022);
  camera = new T.PerspectiveCamera(53, innerWidth / innerHeight, 0.05, 70);
  root.append(renderer.domElement);
  architecture = createArchitecture(scene, renderer);
  setView();
  renderer.render(scene, camera);
  catalogue = await loadCatalogue();
  for (const collection of catalogue.collections) {
    const works = catalogue.works.filter(
      (work) => work.collection === collection.id,
    );
    for (let i = 0; i < works.length; i += 8)
      rooms.push({ collection, works: works.slice(i, i + 8) });
  }
  if (!rooms.length) throw new Error("Il catalogo fotografico è vuoto.");
  await loadRoom(0);
  attachControls();
  entry.disabled = false;
  entry.replaceChildren(document.createTextNode("Entra nella galleria"));
  const arrow = document.createElement("span");
  arrow.className = "button-arrow";
  arrow.textContent = "↗";
  entry.append(arrow);
  status.textContent = "";
  invalidate();
} catch (error) {
  fail(
    error.message || "Il tuo dispositivo non supporta questa esperienza 3D.",
  );
}
