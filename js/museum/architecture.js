import * as T from "../../vendor/three.module.js";
export function createArchitecture(scene, renderer) {
  const room = new T.Group();
  scene.add(room);
  const plaster = new T.MeshStandardMaterial({
    color: 0x333a34,
    roughness: 0.95,
  });
  const stone = new T.MeshStandardMaterial({
    color: 0x727366,
    roughness: 0.58,
    metalness: 0.08,
  });
  const bronze = new T.MeshStandardMaterial({
    color: 0x948065,
    roughness: 0.4,
    metalness: 0.7,
  });
  const charcoal = new T.MeshStandardMaterial({
    color: 0x171c18,
    roughness: 0.85,
  });
  const light = new T.MeshBasicMaterial({ color: 0xe5d5b3 });
  const resources = new Set([plaster, stone, bronze, charcoal, light]);
  function box(w, h, d, x, y, z, material = plaster) {
    const geo = new T.BoxGeometry(w, h, d);
    resources.add(geo);
    const object = new T.Mesh(geo, material);
    object.position.set(x, y, z);
    room.add(object);
    return object;
  }
  // A hand-built room, with no third-party models or image textures.
  const floor = box(14, 0.2, 18, 0, -0.11, 0, stone);
  floor.name = "walkable-floor";
  box(14, 7, 0.35, 0, 3.5, -9);
  box(14, 7, 0.35, 0, 3.5, 9);
  box(0.35, 7, 18, -7, 3.5, 0);
  box(0.35, 7, 18, 7, 3.5, 0);
  box(14, 0.2, 18, 0, 7, 0, charcoal);
  // Recessed lower band, architectural piers, brass ceiling rails.
  for (const side of [-1, 1]) {
    box(0.07, 0.12, 17.7, side * 6.79, 0.07, 0, bronze);
    for (const z of [-7, -1, 5])
      box(0.2, 6.8, 0.32, side * 6.76, 3.4, z, charcoal);
    box(0.045, 0.035, 16, side * 4.3, 6.65, 0, light);
  }
  // Subtle joints in stone slabs establish scale and perspective.
  const joint = new T.MeshBasicMaterial({ color: 0x54574e });
  resources.add(joint);
  for (let x = -6; x <= 6; x += 2) box(0.012, 0.002, 17.8, x, 0.001, 0, joint);
  for (let z = -8; z <= 8; z += 2) box(13.8, 0.002, 0.012, 0, 0.002, z, joint);
  // A floating oak bench — matched by the collision geometry.
  const wood = new T.MeshStandardMaterial({ color: 0x645744, roughness: 0.7 });
  resources.add(wood);
  box(2.3, 0.16, 1.2, 3.65, 0.54, 1.8, wood);
  box(0.12, 0.46, 0.85, 2.8, 0.23, 1.8, charcoal);
  box(0.12, 0.46, 0.85, 4.5, 0.23, 1.8, charcoal);
  // Diffuse overhead lighting: no fullscreen post-processing required on mobile.
  scene.add(new T.HemisphereLight(0xe5e5cf, 0x272b25, 2.15));
  const sun = new T.DirectionalLight(0xffe0ad, 2.7);
  sun.position.set(-2, 6, 4);
  scene.add(sun);
  const back = new T.PointLight(0xdbe5d7, 38, 15, 2);
  back.position.set(0, 5, -5);
  scene.add(back);
  for (const z of [-5, 3]) {
    box(2.6, 0.025, 1.5, 0, 6.82, z, light);
    const pool = new T.PointLight(0xffead0, 40, 12, 2);
    pool.position.set(0, 5.9, z);
    scene.add(pool);
  }
  // Quiet wall typography is part of the architecture, not another artwork.
  function label(text, sub, x, y, z, rotation, width = 3.6) {
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 450;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#d4d0b9";
    ctx.font = "400 145px Georgia";
    ctx.textAlign = "center";
    ctx.fillText(text, 700, 190);
    ctx.fillStyle = "#8c9584";
    ctx.font = "22px sans-serif";
    ctx.fillText(sub, 700, 275);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    resources.add(texture);
    const material = new T.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    resources.add(material);
    const geo = new T.PlaneGeometry(width, (width * 450) / 1400);
    resources.add(geo);
    const mesh = new T.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotation;
    room.add(mesh);
  }
  label(
    "UnconventionArt",
    "FOTOGRAFIA  /  CORPO  /  TRASFORMAZIONE",
    -6.78,
    3.7,
    4.9,
    Math.PI / 2,
    4,
  );
  label(
    "Lascia fuori il rumore.",
    "QUI, PRENDITI IL TUO TEMPO.",
    6.78,
    3.6,
    5.6,
    -Math.PI / 2,
    3.8,
  );
  // Small pool of contact shadow under the bench (procedural, no image editing).
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const c = shadowCanvas.getContext("2d"),
    gradient = c.createRadialGradient(64, 64, 6, 64, 64, 63);
  gradient.addColorStop(0, "rgba(0,0,0,.48)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = gradient;
  c.fillRect(0, 0, 128, 128);
  const shadowTexture = new T.CanvasTexture(shadowCanvas);
  resources.add(shadowTexture);
  const shadowMaterial = new T.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
  });
  resources.add(shadowMaterial);
  const shadowGeometry = new T.PlaneGeometry(3.8, 2.5);
  resources.add(shadowGeometry);
  const shadow = new T.Mesh(shadowGeometry, shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(3.65, 0.012, 1.8);
  room.add(shadow);
  return {
    floor,
    dispose() {
      for (const resource of resources) resource.dispose();
    },
  };
}
export async function createArtwork(slot, renderer) {
  const texture = await new T.TextureLoader().loadAsync(slot.work.image);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const aspect = texture.image.width / texture.image.height;
  const height = Math.min(3.6, 4 / aspect),
    width = height * aspect;
  const group = new T.Group();
  group.position.set(slot.x, 2.8, slot.z);
  group.rotation.y = slot.rotation;
  const resources = [texture];
  function mesh(geometry, material, z = 0) {
    resources.push(geometry, material);
    const m = new T.Mesh(geometry, material);
    m.position.z = z;
    group.add(m);
    return m;
  }
  mesh(
    new T.BoxGeometry(width + 0.24, height + 0.24, 0.12),
    new T.MeshStandardMaterial({
      color: 0x151813,
      roughness: 0.45,
      metalness: 0.3,
    }),
    -0.06,
  );
  mesh(
    new T.PlaneGeometry(width + 0.1, height + 0.1),
    new T.MeshBasicMaterial({ color: 0xc7b995 }),
    0.005,
  );
  const photograph = mesh(
    new T.PlaneGeometry(width, height),
    new T.MeshBasicMaterial({ map: texture, toneMapped: false }),
    0.015,
  );
  photograph.userData.work = slot.work;
  photograph.userData.slot = slot;
  // A label below the real photograph; it follows the wall orientation.
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 130;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#e4ddc7";
  ctx.font = "30px sans-serif";
  ctx.fillText(slot.work.title, 8, 42);
  ctx.fillStyle = "#9ca18e";
  ctx.font = "19px sans-serif";
  ctx.fillText(slot.work.credit || "UnconventionArt", 8, 85);
  const labelTexture = new T.CanvasTexture(canvas);
  labelTexture.colorSpace = T.SRGBColorSpace;
  resources.push(labelTexture);
  const label = mesh(
    new T.PlaneGeometry(1.6, 0.27),
    new T.MeshBasicMaterial({
      map: labelTexture,
      transparent: true,
      toneMapped: false,
      depthWrite: false,
    }),
    0.035,
  );
  label.position.set(0, -height / 2 - 0.4, 0.035);
  const fixture = mesh(
    new T.BoxGeometry(width * 0.7, 0.055, 0.2),
    new T.MeshStandardMaterial({
      color: 0x292b23,
      metalness: 0.6,
      roughness: 0.4,
    }),
    0.22,
  );
  fixture.position.y = height / 2 + 0.22;
  const strip = mesh(
    new T.PlaneGeometry(width * 0.66, 0.025),
    new T.MeshBasicMaterial({ color: 0xffe2a8 }),
    0.33,
  );
  strip.position.y = height / 2 + 0.18;
  // Picture lighting highlights the frame without changing photographic colours.
  const light = new T.PointLight(0xffedc8, 6, 3, 2);
  light.position.set(0, height / 2 + 0.2, 0.7);
  group.add(light);
  const normal = new T.Vector3(
    Math.sin(slot.rotation),
    0,
    Math.cos(slot.rotation),
  );
  const focus = group.position.clone().addScaledVector(normal, 4.8);
  focus.y = 1.7;
  return {
    group,
    photograph,
    slot,
    focus,
    target: group.position.clone(),
    dispose() {
      resources.forEach((r) => r.dispose());
    },
  };
}
