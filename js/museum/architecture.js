import * as T from "../../vendor/three.module.js";
import { createDesignSeating } from "./design-seating.js";
import { furnishGallery } from "./furnishings.js";
import { BUILDING, HALLS, WALLS, FURNITURE, HANGING_CENTER, PHOTO_FORMATS } from "./layout.js";

/** Ten connected white halls. Repeated construction is instanced by material,
 * so the size of the building does not multiply its lighting or draw calls. */
export function createArchitecture(scene, renderer, { mobile = false, onReady = () => {}, occupiedSlots = [] } = {}) {
  const room = new T.Group();
  room.name = "white-museum-200";
  scene.add(room);
  const resources = new Set();
  const lights = [];
  const own = (value) => (resources.add(value), value);
  const material = (options) => own(new T.MeshStandardMaterial(options));
  const plaster = material({ color: 0xffffff, roughness: 0.92 });
  const terrazzo = material({ color: 0xf8f8f8, roughness: 0.52 });
  const stone = material({ color: 0xf8f8f8, roughness: 0.65 });
  const lacquer = material({ color: 0xffffff, roughness: 0.28 });
  const recess = material({ color: 0xd9d9d9, roughness: 0.97 });
  const glow = own(new T.MeshBasicMaterial({ color: 0xffffff }));
  const joint = own(new T.MeshBasicMaterial({ color: 0xeaeaea }));
  const batches = new Map();
  const boxGeometry = own(new T.BoxGeometry(1, 1, 1));
  const box = (w, h, d, x, y, z, surface = plaster) => {
    if (!batches.has(surface)) batches.set(surface, []);
    batches.get(surface).push({ w, h, d, x, y, z });
  };
  const ceiling = BUILDING.height;
  const floorGeometry = own(new T.BoxGeometry(54, 0.2, 140));
  const floor = new T.Mesh(floorGeometry, terrazzo);
  floor.position.set(0, -0.105, -60);
  floor.name = "walkable-floor";
  floor.userData.walkable = true;
  room.add(floor);
  for (const wall of WALLS) {
    box(wall.width, ceiling, wall.depth, wall.x, ceiling / 2, wall.z);
    // A continuous shadow line gives each wall a recessed base and ceiling reveal.
    box(wall.width + 0.006, 0.018, wall.depth + 0.006, wall.x, 0.025, wall.z, recess);
    box(wall.width + 0.008, 0.025, wall.depth + 0.008, wall.x, ceiling - 0.09, wall.z, recess);
  }
  box(54, 0.18, 140, 0, ceiling, -60);

  // Long, luminous promenade. The repeated portals establish readable scale.
  for (const side of [-1, 1]) {
    box(0.1, 0.14, 137.5, side * 4.35, ceiling - 0.25, -59.5);
    box(0.035, 0.018, 136.5, side * 4.24, ceiling - 0.33, -59.5, glow);
  }
  for (let row = 0; row < 6; row++) {
    const z = -row * 26;
    box(10, 0.38, 0.34, 0, ceiling - 0.24, z);
  }
  for (let z = 5; z > -129; z -= 10) {
    box(5.7, 0.04, 5.3, 0, ceiling - 0.13, z, recess);
    box(5.32, 0.03, 4.94, 0, ceiling - 0.16, z, glow);
    box(0.04, 0.06, 5.05, 0, ceiling - 0.19, z);
  }

  for (const hall of HALLS) {
    const { x, z } = hall.center;
    // Doorway lintels stay above eye level and never obstruct the 5m opening.
    box(0.34, 1.9, 5, hall.side * 5, ceiling - 0.95, z);
    for (const edge of [-1, 1]) {
      box(0.38, 4.7, 0.055, hall.side * 5, 2.35, z + edge * 2.5, lacquer);
      box(0.385, 4.7, 0.012, hall.side * 5, 2.35, z + edge * 2.53, recess);
    }
    // Rooflights and fine ceiling reveals define each exhibition chamber.
    for (const offset of [-4.7, 4.7]) {
      box(6.7, 0.06, 17.8, x + offset, ceiling - 0.14, z, recess);
      box(6.3, 0.035, 17.38, x + offset, ceiling - 0.19, z, glow);
      for (const side of [-1, 1])
        box(0.16, 0.2, 17.9, x + offset + side * 3.37, ceiling - 0.23, z);
      for (const dz of [-5.8, 0, 5.8])
        box(6.35, 0.08, 0.055, x + offset, ceiling - 0.22, z + dz);
    }
    // Architectural wall washes use emissive strips, not 200 dynamic lights.
    for (const dz of [-11.7, 11.7]) {
      box(18.2, 0.07, 0.065, x, ceiling - 0.65, z + dz, lacquer);
      box(17.8, 0.018, 0.035, x, ceiling - 0.69, z + dz, glow);
    }
    // Floor joints and skirting: neutral, white-on-white material detail.
    for (const dz of [-12.81, 12.81])
      box(21.5, 0.035, 0.025, x, 0.042, z + dz, recess);
    box(0.025, 0.035, 25.5, hall.side * 26.81, 0.042, z, recess);
  }
  for (let x = -24; x <= 24; x += 4)
    box(0.008, 0.002, 139.5, x, -0.002, -60, joint);
  for (let z = -128; z < 10; z += 4)
    box(53.5, 0.002, 0.008, 0, -0.001, z, joint);

  // Full-size planning mockups: 60% of wall positions, no invented photographs.
  const occupied = new Set(occupiedSlots.map(slot => slot.id));
  const frameInk = material({ color: 0x161616, roughness: 0.48 });
  const paper = own(new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
  const labelGeometry = own(new T.PlaneGeometry(0.62, 0.25));
  const labelMaterials = PHOTO_FORMATS.map(format => {
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = 310;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 768, 310);
    ctx.fillStyle = '#161616'; ctx.font = '28px sans-serif';
    ctx.fillText('UNCONVENTIONART / FOTOGRAFIA', 24, 58);
    ctx.font = '48px sans-serif'; ctx.fillText(format.label, 24, 151);
    ctx.font = '28px sans-serif'; ctx.fillText('SAGOMA DI ALLESTIMENTO', 24, 253);
    const texture = own(new T.CanvasTexture(canvas));
    texture.colorSpace = T.SRGBColorSpace;
    return own(new T.MeshBasicMaterial({ map: texture, toneMapped: false }));
  });
  for (const slot of HALLS.flatMap(hall => hall.slots)) {
    if (occupied.has(slot.id) || !slot.plannedPhoto) continue;
    const nx = Math.sin(slot.rotation), nz = Math.cos(slot.rotation);
    const rx = Math.cos(slot.rotation), rz = -Math.sin(slot.rotation);
    const { width, height } = slot.format;
    const panelBox = (w, h, d, offset, surface) => box(
      Math.abs(rx) * w + Math.abs(nx) * d, h,
      Math.abs(rz) * w + Math.abs(nz) * d,
      slot.x + nx * offset, HANGING_CENTER, slot.z + nz * offset, surface);
    panelBox(width + 0.04, height + 0.04, 0.05, 0, frameInk);
    panelBox(width, height, 0.008, 0.03, paper);
    const label = new T.Mesh(labelGeometry, labelMaterials[slot.formatIndex]);
    label.position.set(slot.x + rx * (width / 2 + 0.42) + nx * 0.035,
      1.15, slot.z + rz * (width / 2 + 0.42) + nz * 0.035);
    label.rotation.y = slot.rotation;
    label.name = `planning-${slot.id}`;
    room.add(label);
  }

  // Contemporary white furniture, sharing the exact footprint used by physics.
  for (const piece of FURNITURE) {
    const { x, z, width: w, depth: d } = piece;
    if (piece.kind === "reception") {
      box(w * 0.9, 0.12, d * 0.82, x, 0.06, z, recess);
      box(w, 1.04, d, x, 0.64, z, lacquer);
      box(w + 0.04, 0.06, d + 0.04, x, 1.19, z, stone);
      box(w + 0.003, 0.014, d + 0.003, x, 0.9, z, recess);
    }
  }

  const features = furnishGallery({ room, own, box, plaster, stone, lacquer, recess, glow, onReady });

  // Include the real floor so the same raycast list supports tap-to-walk.
  const occluders = [floor, ...features, ...createDesignSeating(room, own)];
  const transform = new T.Object3D();
  for (const [surface, instances] of batches) {
    const mesh = new T.InstancedMesh(boxGeometry, surface, instances.length);
    mesh.name = surface === plaster ? "white-architecture" : "museum-details";
    instances.forEach((v, index) => {
      transform.position.set(v.x, v.y, v.z);
      transform.scale.set(v.w, v.h, v.d);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    room.add(mesh);
    if (surface !== glow && surface !== joint) occluders.push(mesh);
  }

  // Shared soft contact shadow texture; no realtime shadow maps on any device.
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 96;
  const shadowContext = shadowCanvas.getContext("2d");
  const gradient = shadowContext.createRadialGradient(48, 48, 3, 48, 48, 48);
  gradient.addColorStop(0, "rgba(0,0,0,.29)");
  gradient.addColorStop(0.5, "rgba(0,0,0,.12)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  shadowContext.fillStyle = gradient;
  shadowContext.fillRect(0, 0, 96, 96);
  const shadowTexture = own(new T.CanvasTexture(shadowCanvas));
  const shadowMaterial = own(
    new T.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  );
  const shadowGeometry = own(new T.PlaneGeometry(1, 1));
  const shadows = new T.InstancedMesh(
    shadowGeometry,
    shadowMaterial,
    FURNITURE.length,
  );
  FURNITURE.forEach((v, index) => {
    transform.position.set(v.x, 0.004, v.z);
    transform.rotation.set(-Math.PI / 2, 0, 0);
    transform.scale.set(v.width + 1.8, v.depth + 1.3, 1);
    transform.updateMatrix();
    shadows.setMatrixAt(index, transform.matrix);
  });
  shadows.computeBoundingSphere();
  room.add(shadows);

  // Hall signs use one small atlas and one material across the whole building.
  const atlas = document.createElement("canvas");
  atlas.width = 512;
  atlas.height = 1024;
  const context = atlas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 512, 1024);
  for (const hall of HALLS) {
    const top = hall.index * 100;
    context.fillStyle = "#565656";
    context.font = "400 47px sans-serif";
    context.fillText(String(hall.index + 1).padStart(2, "0"), 25, top + 61);
    context.font = "15px sans-serif";
    context.fillStyle = "#808080";
    context.fillText("SALA / GALLERY", 131, top + 43);
    context.fillText("UNCONVENTIONART", 131, top + 68);
  }
  const signTexture = own(new T.CanvasTexture(atlas));
  signTexture.colorSpace = T.SRGBColorSpace;
  const signMaterial = own(
    new T.MeshBasicMaterial({ map: signTexture, toneMapped: false }),
  );
  for (const hall of HALLS) {
    const geometry = own(new T.PlaneGeometry(2.4, 0.47));
    const uv = geometry.getAttribute("uv");
    const bottom = 1 - (hall.index * 100 + 100) / 1024;
    for (let index = 0; index < uv.count; index++)
      uv.setY(index, bottom + (uv.getY(index) * 100) / 1024);
    uv.needsUpdate = true;
    const sign = new T.Mesh(geometry, signMaterial);
    sign.position.set(hall.side * 4.815, 2.48, hall.center.z + 4.1);
    sign.rotation.y = hall.side === -1 ? Math.PI / 2 : -Math.PI / 2;
    room.add(sign);
  }
  renderer.shadowMap.enabled = false;
  const sky = new T.HemisphereLight(0xffffff, 0xd8d8d8, 1.85);
  const daylight = new T.DirectionalLight(0xffffff, 2.1);
  daylight.position.set(-12, 26, 12);
  daylight.target.position.set(0, 0, -28);
  scene.add(sky, daylight, daylight.target);
  lights.push(sky, daylight);
  return {
    floor,
    occluders,
    dispose() {
      for (const resource of resources) resource.dispose();
      for (const light of lights) {
        scene.remove(light);
        if (light.target) scene.remove(light.target);
      }
      room.traverse((object) => {
        if (object.isInstancedMesh) object.dispose();
      });
      scene.remove(room);
    },
  };
}

export async function createArtwork(slot, renderer, { mobile = false } = {}) {
  const source =
    mobile && slot.work.thumbnail ? slot.work.thumbnail : slot.work.image;
  const texture = await new T.TextureLoader().loadAsync(source);
  texture.colorSpace = T.SRGBColorSpace;
  const aspect = texture.image.width / texture.image.height;
  // Keep the original photograph intact while bounding its GPU allocation.
  // This only resamples the decoded image used by the 3D wall texture; the
  // full-resolution source remains available in the artwork detail dialog.
  const maxEdge = Math.min(
    mobile ? 1024 : 2048,
    renderer.capabilities.maxTextureSize || Infinity,
  );
  const longestEdge = Math.max(texture.image.width, texture.image.height);
  if (longestEdge > maxEdge) {
    const canvas = document.createElement("canvas");
    const scale = maxEdge / longestEdge;
    canvas.width = Math.max(1, Math.round(texture.image.width * scale));
    canvas.height = Math.max(1, Math.round(texture.image.height * scale));
    const context = canvas.getContext("2d");
    if (context) {
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
      texture.image = canvas;
      texture.needsUpdate = true;
    }
  }
  texture.anisotropy = Math.min(
    mobile ? 2 : 4,
    renderer.capabilities.getMaxAnisotropy(),
  );
  const format = slot.format || { width: 2.6, height: 3.2 };
  const height = Math.min(format.height, format.width / aspect);
  const width = height * aspect;
  const group = new T.Group();
  group.position.set(slot.x, HANGING_CENTER, slot.z);
  group.rotation.y = slot.rotation;
  const resources = new Set([texture]);
  const mesh = (geometry, material, z = 0) => {
    resources.add(geometry);
    resources.add(material);
    const object = new T.Mesh(geometry, material);
    object.position.z = z;
    group.add(object);
    return object;
  };
  mesh(
    new T.BoxGeometry(width + 0.2, height + 0.2, 0.1),
    new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.48 }),
    -0.05,
  );
  mesh(
    new T.PlaneGeometry(width + 0.08, height + 0.08),
    new T.MeshBasicMaterial({ color: 0xffffff }),
    0.006,
  );
  const photograph = mesh(
    new T.PlaneGeometry(width, height),
    new T.MeshBasicMaterial({ map: texture, toneMapped: false }),
    0.014,
  );
  photograph.userData.work = slot.work;
  photograph.userData.slot = slot;
  const canvas = document.createElement("canvas");
  canvas.width = mobile ? 512 : 768;
  canvas.height = mobile ? 288 : 432;
  const ctx = canvas.getContext("2d");
  ctx.scale(canvas.width / 768, canvas.height / 432);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 768, 432);
  ctx.fillStyle = "#303030";
  ctx.font = "500 39px sans-serif";
  ctx.fillText(slot.work.title, 34, 79, 694);
  ctx.font = "25px sans-serif";
  ctx.fillText(slot.work.credit || "UnconventionArt", 34, 135, 694);
  ctx.fillStyle = "#727272";
  ctx.font = "23px sans-serif";
  ctx.fillText(slot.work.medium || "Fotografia", 34, 228, 694);
  ctx.fillText("Scopri l’opera  ↗", 34, 366, 694);
  const labelTexture = new T.CanvasTexture(canvas);
  labelTexture.colorSpace = T.SRGBColorSpace;
  resources.add(labelTexture);
  const label = mesh(
    new T.PlaneGeometry(0.78, 0.43875),
    new T.MeshBasicMaterial({ map: labelTexture, toneMapped: false }),
    0.035,
  );
  label.position.set(width / 2 + 0.59, 1.15 - HANGING_CENTER, 0.035);
  label.userData.work = slot.work;
  label.userData.isPlaque = true;
  // A white wall-mounted fixture; illumination comes from shared daylight.
  const fixture = mesh(
    new T.BoxGeometry(width * 0.65, 0.045, 0.14),
    new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 }),
    0.15,
  );
  fixture.position.y = height / 2 + 0.2;
  const normal = new T.Vector3(
    Math.sin(slot.rotation),
    0,
    Math.cos(slot.rotation),
  );
  const focus = group.position.clone().addScaledVector(normal, 4.8);
  focus.y = 1.7;
  let detailTexture = null,
    detailRequest = null,
    detailWanted = false,
    disposed = false;
  // Only the photograph being observed gets an additional full-detail texture.
  // Distant works retain their small texture, preserving the mobile GPU budget.
  function setDetail(enabled) {
    detailWanted = enabled;
    if (!enabled || disposed) {
      photograph.material.map = texture;
      if (detailTexture) {
        resources.delete(detailTexture);
        detailTexture.dispose();
        detailTexture = null;
      }
      return Promise.resolve();
    }
    if (detailTexture) return Promise.resolve();
    if (detailRequest) return detailRequest;
    detailRequest = new T.TextureLoader()
      .loadAsync(slot.work.image)
      .then((full) => {
        if (disposed || !detailWanted) {
          full.dispose();
          return;
        }
        full.colorSpace = T.SRGBColorSpace;
        full.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        detailTexture = full;
        resources.add(full);
        photograph.material.map = full;
      })
      .finally(() => {
        detailRequest = null;
      });
    return detailRequest;
  }
  return {
    group,
    photograph,
    label,
    width,
    height,
    normal,
    slot,
    focus,
    target: group.position.clone(),
    setDetail,
    dispose() {
      disposed = true;
      detailWanted = false;
      for (const resource of resources) resource.dispose();
    },
  };
}
