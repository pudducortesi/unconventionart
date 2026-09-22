import { furnishWelcomeHall } from "./welcome-hall.js";
import { createLightingFixtures } from "./lighting-fixtures.js";
import * as T from "../../vendor/three.module.js";
import { ROOM_PROFILES } from "./room-profiles.js";
import { FURNITURE, HALLS, BUILDING, RUGS } from "./layout.js";

// Static exhibition fittings: shared box batches and a handful of text panels.
// No video downloads or animation loops until actual films are programmed.
export function furnishGallery({ room, own, box, plaster, stone, lacquer, recess, glow, openHalls, onReady = () => {} }) {
  const targets = [];
  const panel = ({ width, height, x, y, z, rotation = 0, title, subtitle, kicker, dark = false, dialog }) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1536;
    canvas.height = Math.round(1536 * height / width);
    const ctx = canvas.getContext("2d");
    const h = canvas.height;
    ctx.fillStyle = dark ? "#232426" : "#fafafa";
    ctx.fillRect(0, 0, 1536, h);
    ctx.fillStyle = dark ? "#b9babc" : "#777777";
    ctx.font = "24px sans-serif";
    ctx.fillText(kicker, 85, h * 0.18);
    ctx.fillStyle = dark ? "#f7f7f7" : "#303030";
    ctx.font = "300 86px sans-serif";
    ctx.fillText(title, 80, h * 0.51);
    ctx.fillStyle = dark ? "#cccccc" : "#777777";
    ctx.font = "28px sans-serif";
    ctx.fillText(subtitle, 85, h * 0.76);
    ctx.fillRect(85, h * 0.87, 1366, 1);
    const texture = own(new T.CanvasTexture(canvas));
    texture.colorSpace = T.SRGBColorSpace;
    const material = own(new T.MeshBasicMaterial({ map: texture, toneMapped: false }));
    const mesh = new T.Mesh(own(new T.PlaneGeometry(width, height)), material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotation;
    mesh.userData.dialog = dialog;
    mesh.name = `gallery-${dialog || "identity"}`;
    room.add(mesh);
    targets.push(mesh);
    return mesh;
  };

  targets.push(...furnishWelcomeHall({room,own,box,openHalls}));

  const chrome = own(new T.MeshStandardMaterial({ color: 0xc5c7c9, metalness: 0.95, roughness: 0.24 }));
  const tableTop = own(new T.MeshStandardMaterial({ color: 0xededeb, roughness: 0.3 }));
  const round = own(new T.CylinderGeometry(1, 1, 1, 64));
  const cylinder = (radius, height, x, y, z, material) => {
    const mesh = new T.Mesh(round, material);
    mesh.scale.set(radius, height, radius);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    room.add(mesh);
    targets.push(mesh);
  };
  // Coloured woven rugs establish rooms within each large exhibition hall.
  // They are walkable floor finishes; their height stays below contact shadows.
  const rugColors = ROOM_PROFILES.map(profile => profile.rug);
  const weaveColors = ROOM_PROFILES.map(profile => profile.weave);
  const rugs = rugColors.map(color => own(new T.MeshStandardMaterial({ color, roughness: 1 })));
  const weaves = weaveColors.map(color => own(new T.MeshStandardMaterial({ color, roughness: 1 })));
  for (const surface of [...rugs, ...weaves]) surface.userData.walkable = true;
  const ovalGeometry = own(new T.CircleGeometry(1, 64));
  for (const island of RUGS) {
    const rug = rugs[island.hallIndex ?? 0];
    const weave = weaves[island.hallIndex ?? 0];
    if (island.shape === 'oval') {
      const mat = new T.Mesh(ovalGeometry, rug);
      mat.position.set(island.x, 0.001, island.z);
      mat.rotation.x = -Math.PI / 2;
      mat.scale.set(island.width / 2, island.depth / 2, 1);
      mat.userData.walkable = true;
      mat.receiveShadow = true;
      room.add(mat); targets.push(mat);
      continue;
    }
    box(island.width, 0.003, island.depth, island.x, 0, island.z, rug);
    for (let dz = -island.depth / 2 + 0.12; dz < island.depth / 2; dz += 0.18)
      box(island.width - 0.16, 0.0008, 0.018, island.x, 0.002, island.z + dz, weave);
    for (const edge of [-1, 1])
      box(0.035, 0.001, island.depth - 0.12, island.x + edge * (island.width / 2 - 0.08), 0.002, island.z, weave);
  }
  const accents = ROOM_PROFILES.map(profile => profile.color).map(color =>
    own(new T.MeshStandardMaterial({ color, roughness: 0.38 })));
  const dark = own(new T.MeshStandardMaterial({ color: 0x262626, roughness: 0.65 }));
  const ceramic = own(new T.MeshStandardMaterial({ color: 0xf7f6f2, roughness: 0.28 }));
  targets.push(...createLightingFixtures({ room, own, box }));
  for (const piece of FURNITURE) {
    const { x, z, width: w, depth: d } = piece;
    const accent = accents[(piece.hallIndex ?? 0) % accents.length];
    if (piece.kind === 'temu') {
      // Internoitaliano Temù reference: three turned elements, 35 x 35 x 68cm.
      for (let i = 0; i < 3; i++) {
        const angle = i * Math.PI * 2 / 3;
        const sx = x + Math.cos(angle) * 0.085, sz = z + Math.sin(angle) * 0.085;
        cylinder(0.026, 0.64, sx, 0.32, sz, dark);
        cylinder(0.09, 0.04, sx, 0.66, sz, dark);
      }
    }
    if (piece.kind === 'consultation') {
      box(w, 0.055, d, x, 0.98, z, stone);
      for (const side of [-1, 1]) box(0.05, 0.95, d - 0.1, x + side * (w / 2 - 0.15), 0.475, z, chrome);
      box(0.48, 0.035, 0.32, x, 1.028, z, dark);
    }
    if (piece.kind === 'console') {
      box(w - 0.18, 0.12, d - 0.12, x, 0.06, z, recess);
      box(w, 0.65, d, x, 0.46, z, accent);
      box(w + 0.025, 0.045, d + 0.025, x, 0.81, z, stone);
      for (const dx of [-w / 6, w / 6]) {
        box(0.009, 0.60, 0.007, x + dx, 0.47, z - d / 2 - 0.005, recess);
        box(0.009, 0.60, 0.007, x + dx, 0.47, z + d / 2 + 0.005, recess);
      }
      for (let i = 0; i < 5; i++)
        box(0.055, 0.26 + (i % 2) * 0.05, 0.23, x - w * 0.25 + i * 0.062, 0.97, z, i % 2 ? dark : stone);
      cylinder(0.13, 0.30, x + w * 0.27, 0.985, z, ceramic);
      cylinder(0.09, 0.008, x + w * 0.27, 1.14, z, dark);
    }
    if (piece.kind === 'lowtable') {
      // MVSEVM 109/2 Laccio: 136 x 48 x 34cm, dark laminate and tubular steel.
      box(1.36, 0.025, 0.48, x, 0.3275, z, dark);
      for (const dx of [-0.63, 0.63]) {
        for (const dz of [-0.20, 0.20]) cylinder(0.013, 0.30, x + dx, 0.16, z + dz, chrome);
        box(0.026, 0.026, 0.40, x + dx, 0.02, z, chrome);
      }
      box(1.26, 0.026, 0.026, x, 0.29, z - 0.20, chrome);
      box(0.36, 0.025, 0.28, x - 0.30, 0.3525, z, stone);
      box(0.35, 0.008, 0.27, x - 0.29, 0.37, z, plaster);
    }
    if (piece.kind === 'reading') {
      box(w, 0.055, d, x, 0.78, z, stone);
      for (const dx of [-w / 2 + 0.18, w / 2 - 0.18])
        for (const dz of [-d / 2 + 0.12, d / 2 - 0.12]) box(0.045, 0.75, 0.045, x + dx, 0.375, z + dz, chrome);
      for (const dx of [-0.95, 0.95]) {
        box(0.52, 0.035, 0.36, x + dx, 0.826, z, recess);
        const book = panel({ width: 0.50, height: 0.34, x: x + dx, y: 0.85, z,
          kicker: 'UNCONVENTIONART', title: 'Fotografia', subtitle: 'ESPLORA IL CATALOGO', dialog: 'collection' });
        book.rotation.x = -Math.PI / 2;
      }
      cylinder(0.11, 0.02, x, 0.82, z, chrome);
      cylinder(0.014, 0.30, x, 0.98, z, chrome);
      cylinder(0.18, 0.05, x, 1.15, z, ceramic);
      cylinder(0.16, 0.01, x, 1.12, z, glow);
    }
    if (piece.kind === 'coffee') {
      cylinder(0.59, 0.035, x, 0.49, z, tableTop);
      cylinder(0.028, 0.43, x, 0.245, z, chrome);
      cylinder(0.34, 0.025, x, 0.025, z, chrome);
      // Small closed exhibition catalogue gives the lounge a human scale.
      box(0.28, 0.028, 0.36, x + 0.16, 0.525, z, recess);
      box(0.29, 0.005, 0.37, x + 0.16, 0.542, z, plaster);
    }
    if (piece.kind === 'lamp') {
      cylinder(0.27, 0.035, x, 0.022, z, chrome);
      cylinder(0.017, 1.65, x, 0.85, z, chrome);
      cylinder(0.055, 1.1, x, 1.22, z, glow);
      cylinder(0.059, 0.025, x, 1.78, z, chrome);
    }
    if (piece.kind === "ottoman") {
      const base = new T.Mesh(own(new T.CylinderGeometry(w * 0.43, w * 0.43, 0.13, 32)), recess);
      base.position.set(x, 0.065, z);
      room.add(base);
      targets.push(base);
      const seat = new T.Mesh(own(new T.CylinderGeometry(w * 0.47, w * 0.5, 0.40, 48)), accent);
      seat.position.set(x, 0.32, z);
      room.add(seat);
      targets.push(seat);
    }
    if (piece.kind === "screen") {
      // A freestanding screening wall, white on its reverse, with a slim inset display.
      box(w, 3.65, d, x, 1.825, z, plaster);
      box(w - 0.6, 2.82, 0.06, x, 2, z + d / 2 + 0.025, lacquer);
      const display = panel({ width: w - 0.82, height: 2.58, x, y: 2, z: z + d / 2 + 0.062,
        kicker: "UNCONVENTIONART / MOVING IMAGE", title: "Corpo. Luce. Tempo.",
        subtitle: "Programmazione prossimamente     /     Tocca per esplorare", dark: true, dialog: "moving-image" });
      display.userData.videoHall = piece.hallIndex;
      box(w - 0.7, 0.025, 0.03, x, 0.21, z + d / 2 + 0.02, glow);
      box(w + 0.7, 0.12, 2.8, x, BUILDING.height - 0.85, z, plaster);
    }
    if (piece.kind === "directory") {
      box(w, 1.5, d, x, 0.75, z, lacquer);
      panel({ width: w - 0.1, height: 0.75, x, y: 1.09, z: z - d / 2 - 0.01, rotation: Math.PI,
        kicker: "UNCONVENTIONART", title: "Esplora.", subtitle: "MAPPA DELLE SALE  ↗", dialog: "floorplan" });
    }
    if (piece.kind === "editorial") {
      box(w, 0.10, d, x, 0.8, z, stone);
      for (const side of [-1, 1]) box(0.1, 0.75, d - 0.22, x + side * (w / 2 - 0.2), 0.375, z, lacquer);
      for (const dx of [-0.65, 0, 0.65]) {
        box(0.5, 0.09, 0.66, x + dx, 0.9, z, plaster);
        box(0.51, 0.012, 0.67, x + dx, 0.95, z, recess);
      }
      const cover = panel({ width: 0.48, height: 0.63, x: x - 0.65, y: 0.962, z,
        kicker: "UNCONVENTIONART", title: "Archivio", subtitle: "ESPLORA LE OPERE ↗", dialog: "collection" });
      cover.rotation.x = -Math.PI / 2;
      panel({ width: 1.55, height: 0.25, x, y: 0.63, z: z + d / 2 + 0.01,
        kicker: "", title: "L’archivio fotografico", subtitle: "", dialog: "collection" });
    }
  }

  panel({ width: 5.6, height: 1.65, x: 0, y: 2.65, z: -129.81,
    kicker: "UNCONVENTIONART / DIECI SPAZI, UN PERCORSO", title: "Continua a guardare.",
    subtitle: "RITROVA LE OPERE NELL’INDICE  ↗", dark: true, dialog: "collection" });
  return targets;
}
