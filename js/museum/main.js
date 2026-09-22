import { displayImageURL } from "./image-cache.js";
import { createSelection, selectionFromHash, selectionLink } from "./selection.js";
import { createPerformancePolicy } from "./performance-policy.js";
import { createResolutionPolicy } from "./resolution-policy.js";
import { selectPixelRatios } from './render-quality.js';
import { createGuidedVisit } from "./guided-visit.js";
import { createEnvironment } from "./environment.js";
import * as T from "../../vendor/three.module.js";
import { loadCatalogue } from "../catalogue.js";
import { createVideoScreens } from './video-screens.js';
let videoScreens;
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
  orientation,
  shortestAngle,
  layoutWorks,
  viewingDistance,
} from "./navigation.js";
import { MEZZANINES, MEZZANINE_HEIGHT } from "./mezzanine-layout.js";
import { moveOnLevels, findLevelPath, safeLevelViewpoint } from "./level-navigation.js";

// Fetch effects concurrently with the catalogue; initialization still precedes entry.
const effectsModule = import('../../vendor/gallery-effects.js').then(module => ({module}), error => ({error}));
const $ = (selector) => document.querySelector(selector);
// Deterrence for casual saving, not DRM: public previews remain renderable.
for (const type of ['contextmenu', 'dragstart']) document.addEventListener(type, event => {
  if (event.target instanceof Element && event.target.closest('img, canvas, model-viewer')) event.preventDefault();
}, { capture: true });
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
  environment,
  effects,
  controls,
  stream,
  catalogue,
  slots = [];
let entered = false,
  disposed = false,
  modalOpen = false,
  selected = -1,
  hallIndex = -2,
  hallLevel = "";
let frame = 0,
  lastTime = 0,
  lastHud = 0,
  lastStream = 0;
let viewport = { width: innerWidth, height: innerHeight };
const performancePolicy = createPerformancePolicy();
const resolutionPolicy = createResolutionPolicy({ wake: invalidate });
let savedSelection, selectionOnly = false;
let studioPromise, performanceMode = 'auto';
try { performanceMode = localStorage.getItem('ua-performance') || 'auto'; } catch {}
if (!['auto','fluid','detail'].includes(performanceMode)) performanceMode = 'auto';
function pixelRatios() {
  return selectPixelRatios({ ...viewport, pixelRatio: devicePixelRatio, mobile,
    mode: performanceMode, profile: performancePolicy.profile,
    maxTextureSize: renderer?.capabilities.maxTextureSize });
}
$('#performance-mode').value = performanceMode;
$('#performance-mode').addEventListener('change', () => {
  performanceMode = $('#performance-mode').value;
  try { localStorage.setItem('ua-performance', performanceMode); } catch {}
  invalidate();
});
async function openStudio(id, panel='discover') {
  if (!catalogue?.works.length) { announce('Il catalogo sta caricando. Riprova fra un momento.'); return; }
  openDialog('collector-studio');
  $('#studio-note').textContent='Preparazione dello Studio…';
  try {
    studioPromise ||= import('./collector-studio.js').then(({mountStudio}) => mountStudio({
      catalogue, selection: savedSelection,
      inspect(id) { selected=slots.findIndex(s=>s.work.id===id);inspect(); },
      tour() { if(entered) $('#tour-pilot').click(); else { openDialog('guided-tours'); announce('La visita 3D non è disponibile su questo dispositivo. Le schede restano consultabili nello Studio.'); } },
      halls:HALLS,
      visit(index) { if(entered) visitHall(index); else { openDialog('floorplan'); } },
      status:buildCollection,
    }));
    const studio = await studioPromise;
    studio.open(id,panel);
  } catch { studioPromise=null; $('#studio-note').textContent='Lo Studio non è disponibile. Chiudi e riprova.'; }
}
$('#studio-open').addEventListener('click', () => openStudio());
$('#artwork-studio').addEventListener('click', () => { const id=slots[selected]?.work.id;$('#artwork').close();openStudio(id,'wall'); });
let detailArtwork = null;
let focusRequest = 0;
let realistic = true;
// Prefer restrained contact shading; the HBAO profile remains opt-in.
let advanced = false;
let photoRender = null, photoBusy = false, photoToken = 0;
const player = { x: INITIAL.x, z: INITIAL.z, floorY: 0 };
const eyePosition = () => ({ ...player, y: player.floorY + 1.7 });
const initialLook = orientation(INITIAL, INITIAL_TARGET);
let yaw = initialLook.yaw,
  pitch = initialLook.pitch,
  path = [],
  finalLook = null;
let assistedMovement = false;
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

const guide = createGuidedVisit({
  go(step) {
    stop(); clearSelection();
    if (step.workIndex !== undefined) focusWork(step.workIndex);
    else visitHall(step.hallIndex);
    controls?.focus();
  },
  onPause() { focusRequest++; path = []; finalLook = null; invalidate(); },
  onChange(state) {
    $("#tour-panel").hidden = !state.active;
    document.body.classList.toggle("guided", state.active);
    if (!state.active) { announce("Visita terminata. Esplorazione libera."); return; }
    $("#tour-count").textContent = `VISITA GUIDATA · ${state.index + 1} / ${state.total}`;
    $("#tour-title").textContent = state.step.title;
    $("#tour-description").textContent = state.step.description;
    $("#tour-previous").disabled = state.index === 0;
    $("#tour-pause").textContent = state.paused ? "Riprendi" : "Pausa";
    $("#tour-pause").setAttribute("aria-pressed", String(state.paused));
    $("#tour-next").textContent = state.index === state.total - 1 ? "Concludi ✓" : "Prossima tappa →";
    $("#tour-status").textContent = state.paused ? "In pausa · esplora liberamente" : "Ti accompagniamo alla tappa. Prosegui quando vuoi.";
    announce(`${state.step.title}. ${state.paused ? "Guida in pausa." : state.step.description}`);
  },
});
$("#tour-pilot").addEventListener("click", () => {
  $("#guided-tours").close();
  if (!entered || !slots.length) return;
  guide.start([
    { hallIndex: slots[0].hallIndex, title: "01 / La soglia", description: "Metamorfosi — un prologo in tre tappe. Attraversa lo spazio e lascia che lo sguardo si abitui alla luce. Prosegui quando vuoi." },
    { workIndex: 0, title: "02 / Presenza", description: slots[0].work.description || slots[0].work.alt },
    { workIndex: 0, title: "03 / Il tuo sguardo", description: "Apri la fotografia in HD. Osserva i dettagli, poi salvala nella tua selezione: sarà il primo tassello del tuo percorso personale." },
  ]);
});
$("#selection-filter").addEventListener("click", () => { selectionOnly = !selectionOnly; buildCollection(); });
$("#selection-tour").addEventListener("click", () => {
  if (!entered) return;
  const steps = slots.flatMap((s, i) => savedSelection.has(s.work.id) ? [{ workIndex: i, title: s.work.title, description: s.work.description || s.work.alt }] : []);
  $("#collection").close(); guide.start(steps);
});
$("#selection-share").addEventListener("click", async () => {
  const link = selectionLink(location.href, savedSelection.ids());
  $("#selection-link").hidden = false; $("#selection-link").value = link;
  try { await navigator.clipboard.writeText(link); $("#selection-status").textContent = "Link copiato. Chi lo apre ritrova queste fotografie nell’indice Opere."; }
  catch { $("#selection-link").select(); $("#selection-status").textContent = "Copia il link qui sotto per condividere la selezione."; }
});
$("#artwork-save").addEventListener("click", () => {
  const work = slots[selected]?.work; if (!work) return;
  savedSelection.toggle(work.id); buildCollection();
  $("#artwork-save").setAttribute("aria-pressed", String(savedSelection.has(work.id)));
  $("#artwork-save").textContent = savedSelection.has(work.id) ? "♥ Salvata · rimuovi" : "♡ Salva nella selezione";
  announce(savedSelection.persistent ? "Selezione aggiornata su questo dispositivo." : "Selezione aggiornata per questa visita; usa Condividi per conservarla.");
});
$("#tour-spaces").addEventListener("click", () => {
  $("#guided-tours").close();
  if (entered) guide.start(HALLS.map(h => ({ hallIndex: h.index, title: h.profile.name, description: h.profile.mood })));
});
$("#tour-art").addEventListener("click", () => {
  $("#guided-tours").close();
  if (entered) guide.start(slots.map((s, i) => ({ workIndex: i, title: s.work.title, description: s.work.description || s.work.alt || "Avvicinati e apri il cartellino per conoscere l’opera." })));
});
$("#tour-next").addEventListener("click", () => guide.next());
$("#tour-previous").addEventListener("click", () => guide.previous());
$("#tour-pause").addEventListener("click", () => { if (guide.state().paused) guide.resume(); else { stop(); guide.pause(); } });
$("#tour-end").addEventListener("click", () => { stop(); guide.end(); controls?.focus(); });
for (const id of ["entrance", "next-work", "previous-work"]) $("#" + id).addEventListener("click", () => guide.pause(), { capture: true });

$("#advanced-toggle").addEventListener("click", () => {
  if (!effects) return;
  advanced = !advanced;
  try {
    effects.setAdvanced(advanced); realistic = true;
    $("#advanced-toggle").setAttribute("aria-pressed", String(advanced));
    $("#advanced-toggle").textContent = advanced ? "Ombre: profonde" : "Ombre: morbide";
    $("#graphics-toggle").textContent = "Grafica: realistica";
    $("#graphics-toggle").setAttribute("aria-pressed", "true");
    $("#graphics-status").textContent = advanced ? "Ombre profonde e riduzione del rumore attive." : "Ombre morbide attive.";
  } catch (error) { advanced=false; effects.setAdvanced(false); announce("Ombre morbide ripristinate."); }
  invalidate();
});
$("#graphics-toggle").addEventListener("click", () => {
  realistic = !realistic;
  $("#graphics-toggle").textContent = realistic ? "Grafica: realistica" : "Grafica: standard";
  $("#graphics-toggle").setAttribute("aria-pressed", String(realistic));
  $("#graphics-status").textContent = realistic ? "Ombre di contatto e antialiasing attivi." : "Effetti disattivati per confrontare la resa.";
  invalidate();
});
function leavePhotoRender() {
  photoToken++; photoBusy = false;
  photoRender?.dispose(); photoRender = null;
  $("#photo-render-panel").hidden = true;
  renderer?.setRenderTarget(null);
  controls?.focus(); invalidate();
}
$("#photo-render-exit").addEventListener("click", leavePhotoRender);
$("#photo-render-start").addEventListener("click", async () => {
  if (!entered || photoBusy || photoRender) return;
  guide.pause(); stop();
  $("#help").close();
  photoBusy = true; const token = ++photoToken;
  $("#photo-render-panel").hidden = false;
  $("#photo-render-status").textContent = "Preparazione della vista…";
  try {
    const { createPhotoRender } = await import('../../vendor/gallery-photo-render.js');
    if (token !== photoToken || disposed) return;
    const hall = HALLS[locateHall(player)];
    if (!hall) throw new Error('Scegli prima una sala dalla mappa.');
    photoRender = createPhotoRender(renderer,scene,camera,hall.bounds,mobile);
    photoBusy = false; invalidate();
  } catch (error) {
    photoBusy = false;
    $("#photo-render-status").textContent = `Vista non disponibile. ${error.message || ''}`;
    console.warn('Photo render unavailable:', error);
  }
});
function invalidate() {
  if (renderer && camera && !frame && !disposed && !document.hidden) {
    if (!lastTime) lastTime = performance.now();
    frame = requestAnimationFrame(render);
  }
}
function stop() {
  focusRequest++;
  controls?.stop();
  path = [];
  finalLook = null;
  updateNavigationState();
}
function updateNavigationState() {
  const active = path.length > 0 || !!finalLook;
  if (active === assistedMovement) return;
  assistedMovement = active;
  $("#stop-walk").hidden = !active;
  document.body.classList.toggle("auto-walking", active);
}
function dismissVisitChoice() {
  $("#visit-choice").hidden = true;
}
function clearSelection() {
  if (selected < 0) return;
  selected = -1;
  $("#work-panel").hidden = true;
  document.body.classList.remove("viewing");
}
function openDialog(id) {
  guide.pause();
  stop();
  dismissVisitChoice();
  controls?.exitPointerLock();
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
$("#assist-start").addEventListener("click", () => {
  dismissVisitChoice();
  focusWork(0);
});
$("#free-start").addEventListener("click", () => {
  dismissVisitChoice();
  if (mobile) {
    controls?.focus();
    announce("Tocca nella metà sinistra per muoverti e trascina a destra per guardare.");
  } else if (!controls?.requestPointerLock()) {
    controls?.focus();
    announce("Clicca a terra per spostarti e trascina per guardare.");
  }
});
$("#free-look").addEventListener("click", () => {
  dismissVisitChoice();
  controls?.togglePointerLock();
});
$("#stop-walk").addEventListener("click", () => {
  stop();
  announce("Spostamento interrotto. Esplora liberamente.");
  controls?.focus();
  invalidate();
});
function updateMotion() {
  $("#motion-toggle").textContent = smooth
    ? "Movimento fluido"
    : "Spostamenti immediati";
  $("#motion-toggle").setAttribute("aria-pressed", String(smooth));
  if (!smooth && path.length) {
    Object.assign(player, path.at(-1));
    path = [];
    if (finalLook) {
      const look = orientation(eyePosition(), finalLook);
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
  $("#loading-status").textContent = /WebGL|context/i.test(message) ? "La visita 3D non è disponibile in questo browser. Puoi esplorare le opere e lo Studio." : message;
  $("#fallback-open").hidden = !catalogue;
  document.body.classList.add("failed");
  document.body.classList.remove("exploring");
  $("#hud").hidden = true;
}
function setView() {
  camera.position.set(player.x, player.floorY + 1.7, player.z);
  camera.rotation.set(pitch, yaw, 0, "YXZ");
  camera.updateMatrixWorld();
}
function mapPoint(position) {
  return {
    x: 12 + ((position.x - BOUNDS.minX) / (BOUNDS.maxX - BOUNDS.minX)) * 116,
    y: 12 + ((BOUNDS.maxZ - position.z) / (BOUNDS.maxZ - BOUNDS.minZ)) * 300,
  };
}
function updateHud(moving = false) {
  let nearest = null,
    nearestDistance = 12;
  for (const [index, art] of stream.values()) {
    const distance = Math.hypot(player.x - art.slot.x, player.z - art.slot.z, player.floorY - (art.slot.floorY || 0));
    if (index === selected) {
      nearest = art;
      break;
    }
    if (distance < nearestDistance) {
      nearest = art;
      nearestDistance = distance;
    }
  }
  const closeEnough = nearest && Math.hypot(player.x-nearest.slot.x,player.z-nearest.slot.z,player.floorY - (nearest.slot.floorY || 0)) <= (nearest===detailArtwork ? 7 : 5.5);
  const detail = closeEnough && (!moving || nearest===detailArtwork) ? nearest : null;
  if (detail !== detailArtwork) {
    detailArtwork?.setDetail(false);
    detailArtwork = detail;
    detail
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
  const level = player.floorY < .15 ? "PIANO TERRA" : player.floorY < MEZZANINE_HEIGHT - .15 ? "SCALA" : "SOPPALCO";
  if (current !== hallIndex || level !== hallLevel) {
    hallIndex = current;
    hallLevel = level;
    $("#room-label").textContent =
      current < 0
        ? "PROMENADE / 10 SALE"
        : `${HALLS[current].title.toUpperCase()} / ${level} / ${slots.filter((slot) => slot.hallIndex === current).length} OPERE ESPOSTE`;
    $("#change-level").hidden = current < 0;
    $("#change-level").textContent = player.floorY > .15 ? "Scendi ↓" : "Soppalco ↑";
    $("#change-level").setAttribute("aria-label", player.floorY > .15 ? "Scendi al piano terra usando la scala" : "Sali al soppalco usando la scala");
    for (const button of document.querySelectorAll("[data-hall]"))
      button.setAttribute(
        "aria-current",
        String(Number(button.dataset.hall) === current),
      );
  }
}
function walkTo(destination, look = null) {
  dismissVisitChoice();
  controls?.stop();
  path = findLevelPath(player, destination);
  finalLook = look;
  if (!path.length) {
    finalLook = null;
    announce("Scegli un punto libero nella sala.");
    updateNavigationState();
    return;
  }
  if (!smooth) {
    Object.assign(player, path.at(-1));
    path = [];
    if (look) {
      const angle = orientation(eyePosition(), look);
      yaw = angle.yaw;
      pitch = angle.pitch;
      finalLook = null;
    }
    stream.update(player, { selected, force: true });
  }
  updateNavigationState();
  invalidate();
}
function visitHall(index) {
  if (!entered) return;
  dismissVisitChoice();
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
$("#change-level").addEventListener("click", () => {
  if (!entered || modalOpen) return;
  const mezzanine = MEZZANINES[locateHall(player)];
  if (!mezzanine) return;
  guide.pause();
  clearSelection();
  const descend = player.floorY > .15;
  const stair = mezzanine.stair;
  const destination = descend
    ? { x: stair.bottom.x, z: stair.bottom.z + .6, floorY: 0 }
    : { x: stair.top.x, z: stair.top.z - .6, floorY: mezzanine.height };
  walkTo(destination, { x: HALLS[mezzanine.hallIndex].center.x, y: 2.6, z: HALLS[mezzanine.hallIndex].center.z });
  announce(descend ? "Discesa al piano terra lungo la scala." : "Salita al soppalco lungo la scala.");
});

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
  if (!savedSelection) {
    let storage; try { storage = localStorage; } catch {}
    savedSelection = createSelection(slots.map(s => s.work.id), storage);
    const shared = selectionFromHash(location.hash, slots.map(s => s.work.id));
    if (shared !== null) { savedSelection.replace(shared); selectionOnly = true; }
  }
  const saved = savedSelection.ids();
  $("#selection-filter").textContent = `La mia selezione · ${saved.length}`;
  $("#selection-filter").setAttribute("aria-pressed", String(selectionOnly));
  $("#selection-share").disabled = !saved.length;
  $("#selection-tour").disabled = !saved.length || !entered;
  $("#selection-status").textContent = selectionOnly && !saved.length ? "Apri una fotografia e premi Salva per iniziare la tua selezione." : "";
  slots.forEach((slot, index) => {
    if (selectionOnly && !savedSelection.has(slot.work.id)) return;
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
  art.photograph.userData.cannotReceiveAO = true;
  art.label.userData.cannotReceiveAO = true;
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
    `Dettagli della fotografia ${index + 1}`,
  );
  button.type = "button";
  button.title = "Dettagli dell’opera";
  const icon = document.createElement("span");
  icon.textContent = "i";
  icon.setAttribute("aria-hidden", "true");
  button.append(icon);
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
let inspectRequest = 0;
async function inspect() {
  const work = slots[selected]?.work;
  if (!work) return;
  $("#artwork-save").setAttribute("aria-pressed", String(savedSelection.has(work.id)));
  $("#artwork-save").textContent = savedSelection.has(work.id) ? "♥ Salvata · rimuovi" : "♡ Salva nella selezione";
  $("#artwork-title").textContent = work.title;
  $("#artwork-series").textContent =
    collectionFor(work)?.title || "UnconventionArt";
  $("#artwork-load-status").textContent = "Caricamento dell’anteprima…";
  const request = ++inspectRequest;
  $("#artwork-image").removeAttribute("src");
  $("#artwork-image").alt = work.alt || work.title;
  openDialog("artwork");
  try {
    const source = await displayImageURL(work.image);
    if (request === inspectRequest) $("#artwork-image").src = source;
  } catch {
    if (request === inspectRequest) $("#artwork-load-status").textContent = "Caricamento non riuscito. Chiudi e riapri per riprovare.";
  }
}
$("#artwork-image").addEventListener("load", () => {
  $("#artwork-load-status").textContent = "";
});
$("#artwork-image").addEventListener("error", () => {
  $("#artwork-load-status").textContent = "Immagine non disponibile. Chiudi e riapri l’anteprima per riprovare.";
});
async function focusWork(index) {
  if (!slots.length) return;
  dismissVisitChoice();
  stop();
  selected = (index + slots.length) % slots.length;
  const request = focusRequest;
  const intent = selected,
    slot = slots[intent];
  stream.update(player, { selected, force: true });
  announce(`Avvicinamento a ${slot.work.title}.`);
  const art = await stream.ensure(intent);
  if (selected !== intent || request !== focusRequest || disposed) return;
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
  const position = safeLevelViewpoint(slot.viewpoint || desired);
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

function pick(clientX, clientY, interactiveOnly = false) {
  pointerCoords.set((clientX / viewport.width) * 2 - 1, 1 - (clientY / viewport.height) * 2);
  ray.far = 190;
  ray.setFromCamera(pointerCoords, camera);
  const artworks = stream.values().flatMap(([, art]) => [art.photograph, art.label]);
  if (interactiveOnly) {
    // Most frames point at a blank wall/floor. Find an actionable candidate
    // before raycasting detailed furniture just to decide cursor appearance.
    const candidate = ray.intersectObjects([
      ...artworks, ...architecture.occluders.filter(object => object.userData.dialog),
    ], false)[0];
    if (!candidate) return;
    ray.far = Math.max(0, candidate.distance - .001);
    const blocked = ray.intersectObjects(architecture.occluders, false).length > 0;
    return blocked ? undefined : candidate;
  }
  return ray.intersectObjects([...architecture.occluders, ...artworks], false)[0];
}
function updateAim() {
  const hit = pick(viewport.width / 2, viewport.height / 2, true);
  const data = hit?.object.userData;
  const available = !!(data?.work || data?.dialog);
  $("#reticle").classList.toggle("ready", available);
  $("#interact").disabled = !available;
  $("#interact-label").textContent = data?.isPlaque ? "Cartellino" : data?.work ? "Apri in HD" : data?.dialog ? "Esplora" : "Inquadra un’opera";
}
$("#interact").addEventListener("click", () => { if (!$("#interact").disabled) tap({ clientX: viewport.width / 2, clientY: viewport.height / 2 }); });
function tap(event) {
  if (!entered || modalOpen || photoBusy || photoRender) return;
  dismissVisitChoice();
  guide.pause();
  const hit = pick(event.clientX, event.clientY);
  if (!hit) return;
  if (hit.object.userData.dialog) {
    openDialog(hit.object.userData.dialog);
    return;
  }
  const work = hit.object.userData.work;
  if (work) {
    const index = slots.findIndex((slot) => slot.work.id === work.id);
    if (hit.object.userData.isPlaque) describeWork(index);
    else { selected = index; inspect(); }
  } else if (
    hit.object.userData.walkable ||
    hit.object === architecture.floor
  ) {
    clearSelection();
    walkTo({ x: hit.point.x, z: hit.point.z, floorY: hit.object.userData.mezzanine ? Math.max(0, hit.point.y) : 0 });
  }
}
function render(time) {
  frame = 0;
  if (disposed || document.hidden) {
    lastTime = 0;
    return;
  }
  if (photoRender) {
    videoScreens?.update(player,false);
    const previousError = renderer.debug.onShaderError;
    try {
      renderer.debug.onShaderError = () => { throw new Error('Shader non supportato'); };
      const samples = photoRender.render();
      $("#photo-render-status").textContent = samples < 32 ? `Affinamento della luce · ${Math.floor(samples)} / 32` : 'Vista pronta · torna alla visita per muoverti';
      if (samples < 32) invalidate();
    } catch (error) {
      leavePhotoRender();
      $("#graphics-status").textContent = "Vista fotografica non supportata: visita normale ripristinata.";
    } finally { renderer.debug.onShaderError = previousError; }
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
          moveOnLevels(
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
          moveOnLevels(
            player,
            (dx / distance) * step,
            (dz / distance) * step,
          ),
        );
      // On long routes face the route; turn toward the photograph only on arrival.
      const look = path.length > 1 ? { ...next, y: (next.floorY ?? 0) + 1.7 } : finalLook;
      if (look) turnToward(look, delta);
      moving = true;
    } else if (finalLook) {
      const remaining = turnToward(finalLook, delta);
      if (remaining < 0.001) finalLook = null;
      moving = true;
    }
    updateNavigationState();
    if (time - lastStream > 650) {
      stream.update(player, { selected });
      lastStream = time;
    }
  }
  // Restore detail only after a settled pause, not between consecutive swipes.
  performancePolicy.sample(rawDelta, moving);
  const ratios = pixelRatios();
  const desiredPixelRatio = resolutionPolicy.sample(
    moving, ratios.motion, ratios.detail,
  );
  if (Math.abs(renderer.getPixelRatio() - desiredPixelRatio) > 0.01) {
    renderer.setPixelRatio(desiredPixelRatio);
  }
  setView();
  architecture.updateLighting(player);
  videoScreens?.update(player,entered && !modalOpen && !photoRender);
  const fastNavigation = performanceMode === "fluid" || !resolutionPolicy.settled;
  if (effects && realistic && !fastNavigation) {
    const previousError = renderer.debug.onShaderError;
    try {
      renderer.debug.onShaderError = () => { throw new Error('Shader grafico non supportato'); };
      effects.setNavigation(!resolutionPolicy.settled, performancePolicy.profile.economical);
      effects.render(delta);
      if (effects.needsFrame()) invalidate();
    } catch (error) {
      if (advanced) {
        advanced = false; effects.setAdvanced(false);
        $("#advanced-toggle").textContent = "Ombre: morbide";
        $("#advanced-toggle").setAttribute("aria-pressed", "false");
        $("#graphics-status").textContent = "Ombre profonde non supportate: ombre morbide ripristinate.";
        invalidate();
      } else {
        realistic = false;
        $("#graphics-toggle").textContent = "Grafica: standard";
        $("#graphics-toggle").setAttribute("aria-pressed", "false");
        $("#graphics-status").textContent = "Effetti non disponibili su questo dispositivo. Visita standard attiva.";
      }
      console.warn('Postprocessing unavailable:', error);
      renderer.setRenderTarget(null); renderer.render(scene, camera);
    } finally { renderer.debug.onShaderError = previousError; }
  } else { renderer.setRenderTarget(null); renderer.render(scene, camera); }
  positionPlaques(time);
  if (!moving || time - lastHud > 80) {
    updateHud(moving);
    updateAim();
    lastHud = time;
    const fps = performancePolicy.fps;
    if (fps !== null) $("#performance-status").textContent = `Ultima misura in movimento: ${fps} fps · ${performancePolicy.profile.label}.`;

  }
  if (moving) invalidate();
  else lastTime = 0;
}
function turnToward(target, delta) {
  const desired = orientation(eyePosition(), target);
  const difference = shortestAngle(yaw, desired.yaw),
    blend = 1 - Math.exp(-delta * 5);
  yaw += difference * blend;
  pitch += (desired.pitch - pitch) * blend;
  return Math.abs(difference) + Math.abs(desired.pitch - pitch);
}
function resize() {
  if (!renderer || !camera) return;
  if (photoRender || photoBusy) leavePhotoRender();
  const bounds = root.getBoundingClientRect();
  viewport = { width: bounds.width, height: bounds.height };
  const ratios = pixelRatios();
  renderer.setPixelRatio(resolutionPolicy.settled ? ratios.detail : ratios.motion);
  camera.aspect = bounds.width / bounds.height;
  camera.updateProjectionMatrix();
  renderer.setSize(bounds.width, bounds.height, false);
  lastHud = 0;
  invalidate();
}
addEventListener("resize", resize);
window.visualViewport?.addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => {
  guide.pause();
  stop();
  if (document.hidden) {
    resolutionPolicy.suspend();
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  } else invalidate();
});
addEventListener("blur", () => guide.pause());
addEventListener("pagehide", (event) => {
  resolutionPolicy.suspend();
  guide.pause();
  stop();
  if (event.persisted) return;
  disposed = true;
  cancelAnimationFrame(frame);
  controls?.dispose();
  stream?.dispose();
  videoScreens?.dispose();
  architecture?.dispose();
  environment?.dispose();
  photoRender?.dispose();
  effects?.dispose();
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
  // Start the first visible previews while the renderer and effects initialise.
  [...slots].sort((a,b) =>
    Math.hypot(a.x-INITIAL.x,a.z-INITIAL.z,a.floorY||0) -
    Math.hypot(b.x-INITIAL.x,b.z-INITIAL.z,b.floorY||0)
  ).slice(0,6).forEach(slot => { void displayImageURL(slot.work.mobilePreview || slot.work.preview || slot.work.image).catch(() => {}); });
  buildCollection();
  buildMaps();
  renderer = new T.WebGLRenderer({
    // Smooth the high-contrast photograph silhouettes on touch displays too.
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(pixelRatios().motion);
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
  videoScreens = createVideoScreens({scene,videos:catalogue.videos||[],invalidate});
  try {
    environment = createEnvironment(scene, renderer);
  } catch (error) {
    console.warn('Environment reflections unavailable; continuing gallery visit.', error);
  }
  stream = createArtStream({
    slots,
    retainAll: true,
    concurrency: 6,
    load: (slot) => createArtwork(slot, renderer, { mobile, maxTextureEdge: mobile ? 768 : 1024, resolveSource: displayImageURL }),
    mount: mountArtwork,
    unmount: unmountArtwork,
    onError: () =>
      announce("Una fotografia non è disponibile. La visita può continuare."),
  });
  try {
    const loadedEffects = await effectsModule;
    if (loadedEffects.error) throw loadedEffects.error;
    const { createRealisticRenderer } = loadedEffects.module;
    effects = createRealisticRenderer(renderer, scene, camera, mobile);
    try { effects.setAdvanced(advanced); } catch (error) {
      advanced = false; effects.setAdvanced(false);
      $("#advanced-toggle").textContent = "Ombre: morbide";
      $("#advanced-toggle").setAttribute("aria-pressed", "false");
      console.warn('HBAO initialization unavailable:', error);
    }
    $("#advanced-toggle").disabled = false;
    $("#graphics-toggle").disabled = false;
    $("#graphics-status").textContent = "Ombre di contatto e bordi più morbidi attivi.";
  } catch (error) {
    realistic = false;
    $("#graphics-toggle").textContent = "Grafica: standard";
    $("#graphics-toggle").setAttribute("aria-pressed", "false");
    $("#graphics-status").textContent = "Effetti non disponibili. Visita standard attiva.";
    console.warn('Effects initialization unavailable:', error);
  }
  const canvas = renderer.domElement;
  let hoverTime = 0;
  canvas.addEventListener("pointermove", event => {
    if (mobile || !entered || modalOpen || event.buttons || performance.now() - hoverTime < 80) return;
    hoverTime = performance.now();
    const data = pick(event.clientX, event.clientY, true)?.object.userData;
    canvas.classList.toggle("over-art", !!(data?.work || data?.dialog));
  });
  $("#tour-art-count").textContent = `${slots.length} ${slots.length === 1 ? "fotografia esposta" : "fotografie esposte"} · cartellini e visione ravvicinata`;
  $("#tour-art").disabled = !slots.length;
  canvas.tabIndex = 0;
  canvas.setAttribute(
    "aria-label",
    "Galleria 3D: clicca a terra per spostarti o scegli un’opera. In esplorazione libera usa mouse e tastiera; da telefono tocca a sinistra per muoverti.",
  );
  controls = createControls({
    canvas,
    joystickElement: $("#joystick"),
    knobElement: $("#joystick-knob"),
    isEnabled: () => entered && !modalOpen && !disposed && !photoBusy && !photoRender && $("#photo-render-panel").hidden,
    onTap: tap,
    onActivity: (event) => {
      if (event.kind === "move" || event.kind === "look") {
        guide.pause();
        path = [];
        finalLook = null;
        clearSelection();
      }
      invalidate();
    },
    onKeyboardAction: (action) => {
      if (action === "interact") $("#interact").click();
      if (action === "escape") {
        guide.pause();
        stop();
        clearSelection();
      }
    },
    onKeyStateChange: (pressed) => {
      const active = new Set(pressed);
      for (const key of document.querySelectorAll(".movement-keys [data-key]")) {
        const down = active.has(key.dataset.key);
        key.classList.toggle("active", down);
        key.setAttribute("aria-pressed", String(down));
      }
    },
    onPointerLockChange: (locked) => {
      document.body.classList.toggle("pointer-locked", locked);
      $("#free-look").setAttribute("aria-pressed", String(locked));
      $("#visit-mode-label").textContent = locked
        ? "Modalità visita attiva"
        : "Entra nella modalità visita";
      $("#visit-mode-shortcut").textContent = locked
        ? "ESC · Esci e libera il cursore"
        : "Mouse libero";
      $("#movement-hint").textContent = locked
        ? "MUOVI IL MOUSE PER GUARDARE · WASD O FRECCE PER CAMMINARE · CLICCA PER INTERAGIRE"
        : "CLICCA A TERRA PER SPOSTARTI · TRASCINA PER GUARDARE";
      if (!locked) announce("Modalità visita terminata. Il cursore è libero; scegli Entra per riprendere.");
      invalidate();
    },
    onWheel: (event) => {
      guide.pause();
      clearSelection();
      const sign = Math.sign(event.deltaY);
      walkTo(
        moveOnLevels(
          player,
          -Math.sin(yaw) * sign * 2.2,
          -Math.cos(yaw) * sign * 2.2,
        ),
      );
    },
  });
  if (!canvas.requestPointerLock) $("#free-look").hidden = true;
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    fail(
      "La connessione grafica si è interrotta. Ricarica la pagina per riprovare.",
    );
  });
  stream.update(player, { force: true });
  entered = true;
  buildCollection();
  $("#hud").hidden = false;
  $("#next-room").hidden = false;
  $("#previous-work").disabled = slots.length < 2;
  $("#next-work").disabled = !slots.length;
  $("#next-work").innerHTML = slots.length > 1 ? 'Prossima opera <span>→</span>' : 'Guarda l’opera <span>↗</span>';
  document.body.classList.add("exploring");
  $("#loading-status").textContent = "";
  if (!mobile && !modalOpen) controls.focus();
  resize();
  invalidate();
} catch (error) {
  fail(error.message || "Il dispositivo non supporta la visita 3D.");
}
