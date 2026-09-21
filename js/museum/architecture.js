import * as T from "../../vendor/three.module.js";

/**
 * A purpose-built white-cube gallery. Architecture uses only neutral whites;
 * variation comes from light, depth and shadow, never a tint on the artworks.
 * Furnishing bounds are mirrored by the navigation collision map.
 */
export function createArchitecture(scene, renderer) {
  const room = new T.Group();
  room.name = "contemporary-white-gallery";
  scene.add(room);
  const resources = new Set();
  const lights = [];
  const material = (options) => {
    const value = new T.MeshStandardMaterial(options);
    resources.add(value);
    return value;
  };
  const plaster = material({ color: 0xffffff, roughness: 0.94 });
  const floorMaterial = material({ color: 0xf6f6f6, roughness: 0.52 });
  const lacquer = material({ color: 0xffffff, roughness: 0.24 });
  const fabric = material({ color: 0xfafafa, roughness: 1 });
  const stone = material({ color: 0xf5f5f5, roughness: 0.62 });
  const recess = material({ color: 0xdddddd, roughness: 1 });
  const trim = material({ color: 0xececec, roughness: 0.38 });
  const glow = new T.MeshBasicMaterial({ color: 0xffffff });
  resources.add(glow);

  function addMesh(geometry, surface, x, y, z, shadow = true) {
    resources.add(geometry);
    const object = new T.Mesh(geometry, surface);
    object.position.set(x, y, z);
    object.castShadow = shadow;
    object.receiveShadow = true;
    room.add(object);
    return object;
  }
  const box = (w, h, d, x, y, z, surface = plaster, shadow = true) =>
    addMesh(new T.BoxGeometry(w, h, d), surface, x, y, z, shadow);

  function roundedBox(w, h, d, radius, x, y, z, surface) {
    const bevel = Math.min(0.035, h / 4);
    const halfW = w / 2 - bevel,
      halfD = d / 2 - bevel;
    const r = Math.max(0.015, radius - bevel);
    const shape = new T.Shape();
    shape.moveTo(-halfW + r, -halfD);
    shape.lineTo(halfW - r, -halfD);
    shape.quadraticCurveTo(halfW, -halfD, halfW, -halfD + r);
    shape.lineTo(halfW, halfD - r);
    shape.quadraticCurveTo(halfW, halfD, halfW - r, halfD);
    shape.lineTo(-halfW + r, halfD);
    shape.quadraticCurveTo(-halfW, halfD, -halfW, halfD - r);
    shape.lineTo(-halfW, -halfD + r);
    shape.quadraticCurveTo(-halfW, -halfD, -halfW + r, -halfD);
    const geometry = new T.ExtrudeGeometry(shape, {
      depth: h - bevel * 2,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: bevel,
      bevelThickness: bevel,
      steps: 1,
      curveSegments: 6,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, bevel - h / 2, 0);
    return addMesh(geometry, surface, x, y, z);
  }

  const floor = box(14, 0.2, 18, 0, -0.105, 0, floorMaterial, false);
  floor.name = "walkable-floor";
  const ceiling = 5.8;
  box(14, ceiling, 0.35, 0, ceiling / 2, -9);
  box(14, ceiling, 0.35, 0, ceiling / 2, 9);
  box(0.35, ceiling, 18, -7, ceiling / 2, 0);
  box(0.35, ceiling, 18, 7, ceiling / 2, 0);
  box(14, 0.2, 18, 0, ceiling, 0);

  // Fine perimeter shadow gaps keep the white floor distinct from white walls.
  for (const side of [-1, 1]) {
    box(0.025, 0.032, 17.6, side * 6.819, 0.04, 0, recess, false);
    box(13.6, 0.032, 0.025, 0, 0.04, side * 8.819, recess, false);
    // Shallow structural ribs frame the exhibition bays without blocking art.
    for (const z of [-7.3, -1.4, 6.9]) {
      box(0.18, ceiling - 0.12, 0.18, side * 6.74, ceiling / 2, z);
    }
    box(0.18, 0.15, 17.6, side * 6.69, ceiling - 0.2, 0);
    box(0.035, 0.018, 16.8, side * 6.56, ceiling - 0.21, 0, glow, false);
  }

  // Large-format white terrazzo slabs: scale cues, not a decorative floor pattern.
  const joint = new T.MeshBasicMaterial({ color: 0xe2e2e2 });
  resources.add(joint);
  for (let x = -6; x <= 6; x += 3)
    box(0.007, 0.002, 17.8, x, 0, 0, joint, false);
  for (let z = -9; z <= 9; z += 3)
    box(13.8, 0.002, 0.007, 0, 0.001, z, joint, false);

  // Two deeply framed rooflights, plus slim contemporary white lighting tracks.
  for (const x of [-2.5, 2.5]) {
    box(3.3, 0.035, 8.5, x, ceiling - 0.12, -1.9, recess, false);
    box(2.98, 0.025, 8.15, x, ceiling - 0.135, -1.9, glow, false);
    for (const side of [-1, 1]) {
      box(0.16, 0.19, 8.6, x + side * 1.64, ceiling - 0.22, -1.9);
      box(3.36, 0.19, 0.16, x, ceiling - 0.22, -1.9 + side * 4.22);
    }
    for (const z of [-4.65, -1.9, 0.85])
      box(3.05, 0.035, 0.045, x, ceiling - 0.155, z, trim, false);
  }
  for (const side of [-1, 1]) {
    box(0.06, 0.065, 15.8, side * 5.4, ceiling - 0.48, 0, lacquer, false);
    for (const z of [-6.1, -2.5, 1.2, 4.9]) {
      const fixture = addMesh(
        new T.CylinderGeometry(0.085, 0.085, 0.22, 12),
        lacquer,
        side * 5.4,
        ceiling - 0.62,
        z,
        false,
      );
      fixture.rotation.z = side * 0.34;
    }
  }

  // Bench: a rounded monolithic white seat over two inset slab legs.
  // Bounds x [0.45, 2.75], z [-0.3, 0.9].
  roundedBox(2.3, 0.18, 1.2, 0.28, 1.6, 0.48, 0.3, stone);
  roundedBox(0.22, 0.37, 0.84, 0.065, 0.89, 0.185, 0.3, stone);
  roundedBox(0.22, 0.37, 0.84, 0.065, 2.31, 0.185, 0.3, stone);

  // Soft, low white lounge seat; its rounded back faces the side wall.
  // Bounds x [-6, -3.4], z [3.55, 4.85].
  roundedBox(2.6, 0.28, 1.3, 0.28, -4.7, 0.25, 4.2, fabric);
  roundedBox(2.53, 0.16, 1.2, 0.3, -4.7, 0.46, 4.2, fabric);
  roundedBox(2.48, 0.37, 0.28, 0.135, -4.7, 0.62, 4.68, fabric);
  roundedBox(2.12, 0.12, 0.94, 0.24, -4.7, 0.075, 4.2, trim);

  // Sculptural reception in white lacquer; no screens or invented art objects.
  // Bounds x [3.35, 5.95], z [5.475, 6.725].
  roundedBox(2.6, 0.98, 1.25, 0.42, 4.65, 0.55, 6.1, lacquer);
  roundedBox(2.32, 0.1, 1.02, 0.34, 4.65, 0.055, 6.1, trim);
  roundedBox(2.59, 0.065, 1.24, 0.42, 4.65, 1.063, 6.1, stone);
  // A shallow architectural groove makes its scale and curved frontage readable.
  roundedBox(2.59, 0.012, 1.242, 0.418, 4.65, 0.84, 6.1, trim);

  // Arrival portal in the rear wall, a white-on-white architectural recess.
  box(2.9, 3.55, 0.055, 0, 1.775, 8.795, recess, false);
  box(2.65, 3.32, 0.035, 0, 1.66, 8.751, stone, false);
  for (const side of [-1, 1]) box(0.17, 3.68, 0.2, side * 1.51, 1.84, 8.7);
  box(3.18, 0.18, 0.2, 0, 3.62, 8.7);
  box(0.009, 3.24, 0.02, 0, 1.62, 8.727, trim, false);

  // Neutral daylight. One inexpensive shadow map grounds furniture on mobile.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const sky = new T.HemisphereLight(0xffffff, 0xe5e5e5, 2.0);
  scene.add(sky);
  lights.push(sky);
  const daylight = new T.DirectionalLight(0xffffff, 2.25);
  daylight.position.set(-3.7, 10.8, 2.3);
  daylight.target.position.set(0, 0, -2);
  daylight.castShadow = true;
  daylight.shadow.mapSize.set(1024, 1024);
  daylight.shadow.camera.left = -10;
  daylight.shadow.camera.right = 10;
  daylight.shadow.camera.top = 12;
  daylight.shadow.camera.bottom = -12;
  daylight.shadow.camera.near = 0.5;
  daylight.shadow.camera.far = 27;
  daylight.shadow.normalBias = 0.045;
  daylight.shadow.bias = -0.00015;
  daylight.shadow.radius = 4;
  // The roof acts as a luminous sky; it must not block that illumination.
  room.children
    .filter((object) => object.position.y >= ceiling - 0.5)
    .forEach((object) => {
      object.castShadow = false;
    });
  scene.add(daylight, daylight.target);
  lights.push(daylight);
  for (const z of [-5.6, 3.6]) {
    const fill = new T.PointLight(0xffffff, 11, 13, 2);
    fill.position.set(1.4, 4.7, z);
    scene.add(fill);
    lights.push(fill);
  }

  // Soft contact occlusion is procedural architecture, never a photo overlay.
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  const context = shadowCanvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 12, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,.17)");
  gradient.addColorStop(0.48, "rgba(0,0,0,.09)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const shadowTexture = new T.CanvasTexture(shadowCanvas);
  resources.add(shadowTexture);
  const shadowMaterial = new T.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  resources.add(shadowMaterial);
  for (const [x, z, w, d] of [
    [1.6, 0.3, 3.7, 2.3],
    [-4.7, 4.2, 3.5, 2.15],
    [4.65, 6.1, 3.5, 2.1],
  ]) {
    const shadow = addMesh(
      new T.PlaneGeometry(w, d),
      shadowMaterial,
      x,
      0.006,
      z,
      false,
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.receiveShadow = false;
  }

  function wallType(text, sub, x, y, z, rotation, width) {
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 420;
    const context = canvas.getContext("2d");
    context.fillStyle = "#505050";
    context.font = "400 105px Georgia";
    context.textAlign = "center";
    context.fillText(text, 700, 178);
    context.fillStyle = "#797979";
    context.font = "22px sans-serif";
    context.fillText(sub, 700, 260);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    resources.add(texture);
    const surface = new T.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    resources.add(surface);
    const lettering = addMesh(
      new T.PlaneGeometry(width, width * 0.3),
      surface,
      x,
      y,
      z,
      false,
    );
    lettering.rotation.y = rotation;
    lettering.receiveShadow = false;
  }
  wallType(
    "UnconventionArt",
    "FOTOGRAFIA CONTEMPORANEA",
    -6.785,
    2.75,
    5.65,
    Math.PI / 2,
    3.6,
  );
  wallType(
    "Prenditi il tuo tempo.",
    "UNO SPAZIO PER GUARDARE",
    6.785,
    2.95,
    5.55,
    -Math.PI / 2,
    3.3,
  );

  for (const object of room.children) {
    if (object.isMesh && object.position.y <= 0.005)
      object.userData.walkable = true;
  }
  return {
    floor,
    occluders: room.children.filter(
      (object) => object.isMesh && !object.material.transparent,
    ),
    dispose() {
      for (const resource of resources) resource.dispose();
      for (const light of lights) {
        light.shadow?.map?.dispose();
        scene.remove(light);
        if (light.target) scene.remove(light.target);
      }
      scene.remove(room);
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
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.04,
    }),
    -0.06,
  );
  mesh(
    new T.PlaneGeometry(width + 0.1, height + 0.1),
    new T.MeshBasicMaterial({ color: 0xffffff }),
    0.005,
  );
  const photograph = mesh(
    new T.PlaneGeometry(width, height),
    new T.MeshBasicMaterial({ map: texture, toneMapped: false }),
    0.015,
  );
  photograph.userData.work = slot.work;
  photograph.userData.slot = slot;
  // Physical wall label to the right of the photograph; also a raycast target.
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 900, 480);
  ctx.fillStyle = "#282828";
  ctx.font = "500 44px sans-serif";
  ctx.fillText(slot.work.title, 45, 95, 790);
  ctx.font = "30px sans-serif";
  ctx.fillText(slot.work.credit || "UnconventionArt", 45, 160, 790);
  ctx.fillStyle = "#676767";
  ctx.font = "26px sans-serif";
  ctx.fillText("Fotografia", 45, 245);
  ctx.fillText("Scopri l’opera  ↗", 45, 390);
  const labelTexture = new T.CanvasTexture(canvas);
  labelTexture.colorSpace = T.SRGBColorSpace;
  resources.push(labelTexture);
  const label = mesh(
    new T.PlaneGeometry(0.95, 0.507),
    new T.MeshBasicMaterial({ map: labelTexture, toneMapped: false }),
    0.04,
  );
  label.position.set(width / 2 + 0.72, -1.15, 0.04);
  label.userData.work = slot.work;
  label.userData.isPlaque = true;
  const fixture = mesh(
    new T.BoxGeometry(width * 0.7, 0.055, 0.2),
    new T.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.05,
      roughness: 0.4,
    }),
    0.22,
  );
  fixture.position.y = height / 2 + 0.22;
  const strip = mesh(
    new T.PlaneGeometry(width * 0.66, 0.025),
    new T.MeshBasicMaterial({ color: 0xffffff }),
    0.33,
  );
  strip.position.y = height / 2 + 0.18;
  // Picture lighting highlights the frame without changing photographic colours.
  const light = new T.PointLight(0xffffff, 6, 3, 2);
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
    label,
    width,
    height,
    normal,
    slot,
    focus,
    target: group.position.clone(),
    dispose() {
      resources.forEach((r) => r.dispose());
    },
  };
}
