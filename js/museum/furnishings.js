import * as T from "../../vendor/three.module.js";
import { FURNITURE, HALLS, BUILDING } from "./layout.js";

// Static exhibition fittings: shared box batches and a handful of text panels.
// No video downloads or animation loops until actual films are programmed.
export function furnishGallery({ room, own, box, plaster, stone, lacquer, recess, glow }) {
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

  // Arrival wall: quiet identity, floating canopy and light-lined reception.
  panel({ width: 8, height: 2.3, x: 16.5, y: 3.3, z: 9.81, rotation: Math.PI,
    kicker: "FOTOGRAFIA / RITRATTO / TRASFORMAZIONE", title: "unconventionart",
    subtitle: "Uno spazio da attraversare. Uno sguardo da abitare.", dialog: "about" });
  box(12, 0.18, 5.5, 15, 4.8, 5, plaster);
  box(10.8, 0.025, 0.045, 15, 4.69, 2.5, glow);
  box(4.15, 0.03, 0.025, 17.5, 0.19, 4.18, glow);

  for (const piece of FURNITURE) {
    const { x, z, width: w, depth: d } = piece;
    if (piece.kind === "ottoman") {
      const base = new T.Mesh(own(new T.CylinderGeometry(w * 0.43, w * 0.43, 0.13, 32)), recess);
      base.position.set(x, 0.065, z);
      room.add(base);
      targets.push(base);
      const seat = new T.Mesh(own(new T.CylinderGeometry(w * 0.47, w * 0.5, 0.40, 48)), stone);
      seat.position.set(x, 0.32, z);
      room.add(seat);
      targets.push(seat);
    }
    if (piece.kind === "screen") {
      // A freestanding screening wall, white on its reverse, with a slim inset display.
      box(w, 3.65, d, x, 1.825, z, plaster);
      box(w - 0.6, 2.82, 0.06, x, 2, z + d / 2 + 0.025, lacquer);
      panel({ width: w - 0.82, height: 2.58, x, y: 2, z: z + d / 2 + 0.062,
        kicker: "UNCONVENTIONART / MOVING IMAGE", title: "Corpo. Luce. Tempo.",
        subtitle: "Programmazione prossimamente     /     Tocca per esplorare", dark: true, dialog: "moving-image" });
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

  // Visible ceiling tracks give scale without adding per-artwork dynamic lights.
  for (const hall of HALLS) {
    const { x, z } = hall.center;
    for (const dz of [-9.7, 9.7]) {
      box(17.5, 0.065, 0.09, x, 5.55, z + dz, lacquer);
      for (const dx of [-7, -3.5, 0, 3.5, 7]) {
        box(0.07, 0.2, 0.07, x + dx, 5.43, z + dz, lacquer);
        box(0.19, 0.23, 0.28, x + dx, 5.24, z + dz, lacquer);
        box(0.14, 0.015, 0.21, x + dx, 5.12, z + dz, glow);
      }
    }
  }
  return targets;
}
