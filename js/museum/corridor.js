import * as T from '../../vendor/three.module.js';
import { HALLS, BUILDING, FURNITURE } from './layout.js';
import { CORRIDOR_COFFERS } from './corridor-layout.js';

// A white architectural promenade: deep door surrounds, luminous coffers and
// quiet places to pause. Static geometry joins the building's material batches.
export function furnishCorridor({ room, own, box, plaster, recess, glow }) {
  const ceiling = BUILDING.height;
  const bronze = own(new T.MeshStandardMaterial({ color: 0x88704d, roughness: .45, metalness: .35 }));
  bronze.userData.walkable = true;
  const diffuser = own(new T.MeshStandardMaterial({
    color: 0xfdfbf7, roughness: .72, emissive: 0xfff0d7, emissiveIntensity: .22,
  }));

  for (const side of [-1, 1]) {
    // Hairline inlays retain the continuous mahogany floor.
    box(.025, .002, 139.5, side * 3.1, -.001, -60, bronze);
    box(.16, .30, 138, side * 4.35, ceiling - .31, -60, plaster);
    box(.035, .018, 138, side * 4.24, ceiling - .35, -60, glow);
  }
  for (const fixture of CORRIDOR_COFFERS) {
    const { z, width, depth } = fixture;
    box(width + .48, .04, depth + .48, 0, ceiling - .13, z, recess);
    box(width, .03, depth, 0, ceiling - .16, z, diffuser);
    for (const side of [-1, 1]) {
      box(.14, .18, depth + .48, side * (width / 2 + .17), ceiling - .22, z, plaster);
      box(width + .48, .18, .14, 0, ceiling - .22, z + side * (depth / 2 + .17), plaster);
      box(width, .07, .035, 0, ceiling - .20, z + side * depth / 6, plaster);
    }
  }

  for (let row = 0; row < HALLS.length / 2; row++) {
    const z = HALLS[row * 2].center.z;
    // The suspended lintel marks the junction, leaving over five metres below.
    box(9.55, .60, .32, 0, 5.4, z, plaster);
    box(8.8, .018, .08, 0, 5.091, z, glow);
    for (const side of [-1, 1]) {
      box(.045, .58, .045, side * 4.35, 5.99, z, plaster);
      box(6.2, .002, .025, 0, -.001, z + side * 3, bronze);
    }
  }
  for (const hall of HALLS) {
    const { z } = hall.center, side = hall.side;
    // All projections stay inside the existing wall collision clearance.
    // The full five-metre opening remains available in both directions.
    for (const end of [-1, 1]) {
      box(.20, 4.96, .24, side * 4.74, 2.5, z + end * 2.64, plaster);
      box(.022, 4.72, .035, side * 4.807, 2.42, z + end * 2.81, recess);
      box(.018, 4.45, 9.76, side * 4.818, 2.43, z + end * 7.9, plaster);
      box(.022, .12, 10.15, side * 4.810, .085, z + end * 7.8, recess);
      for (const offset of [6.8, 10.9])
        box(.025, 4.35, .016, side * 4.805, 2.48, z + end * offset, recess);
    }
    box(.20, .26, 5.52, side * 4.74, 4.85, z, plaster);
  }

  for (const bench of FURNITURE.filter(piece => piece.kind === 'corridor-bench')) {
    const { x, z, width, depth, height } = bench;
    box(width, .10, depth, x, height - .05, z, plaster);
    for (const end of [-1, 1])
      box(width - .10, height - .10, .20, x, (height - .10) / 2, z + end * (depth / 2 - .30), plaster);
  }

  return createWayfinding({ room, own, box, plaster, recess });
}

function createWayfinding({ room, own, box, plaster, recess }) {
  // Twenty wall signs and ten directional faces share a single 1024×2048 atlas.
  const atlas = document.createElement('canvas');
  atlas.width = 1024; atlas.height = 2048;
  const ctx = atlas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, atlas.width, atlas.height);
  for (const hall of HALLS) {
    const x = (hall.index % 2) * 512, y = Math.floor(hall.index / 2) * 320;
    ctx.fillStyle = '#767773'; ctx.font = '24px sans-serif';
    ctx.fillText('SALA', x + 32, y + 49);
    ctx.fillStyle = '#292b2a'; ctx.font = '400 130px sans-serif';
    ctx.fillText(String(hall.index + 1).padStart(2, '0'), x + 24, y + 183);
    ctx.font = '40px sans-serif';
    ctx.fillText(hall.profile.name, x + 32, y + 257);
  }
  const directions = [];
  for (let row = 0; row < HALLS.length / 2; row++) {
    const pair = HALLS.slice(row * 2, row * 2 + 2);
    for (const facing of [1, -1]) {
      const [left, right] = facing === 1 ? pair : [...pair].reverse();
      const top = 1600 + directions.length * 44;
      const number = hall => String(hall.index + 1).padStart(2, '0');
      ctx.fillStyle = '#292b2a'; ctx.font = '500 30px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`← ${number(left)}  ${left.profile.name}`, 32, top + 32);
      ctx.textAlign = 'right';
      ctx.fillText(`${right.profile.name}  ${number(right)} →`, 992, top + 32);
      ctx.textAlign = 'left';
      directions.push({ z: pair[0].center.z, facing, top, halls: [left.index, right.index] });
    }
  }
  const texture = own(new T.CanvasTexture(atlas));
  texture.colorSpace = T.SRGBColorSpace;
  const material = own(new T.MeshBasicMaterial({ map: texture, toneMapped: false }));
  const signs = [];
  const sign = (width, height, rect, name) => {
    const geometry = own(new T.PlaneGeometry(width, height));
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (rect.x + uv.getX(i) * rect.width) / atlas.width,
        1 - (rect.y + (1 - uv.getY(i)) * rect.height) / atlas.height);
    }
    const mesh = new T.Mesh(geometry, material);
    mesh.name = name;
    room.add(mesh); signs.push(mesh);
    return mesh;
  };
  for (const hall of HALLS) {
    for (const end of [-1, 1]) {
      const z = hall.center.z + end * 3.85;
      box(.04, 1.16, 1.84, hall.side * 4.785, 2.25, z, recess);
      box(.042, 1.12, 1.80, hall.side * 4.760, 2.25, z, plaster);
      const mesh = sign(1.8, 1.125, {
        x: (hall.index % 2) * 512, y: Math.floor(hall.index / 2) * 320, width: 512, height: 320,
      }, `corridor-room-${hall.index + 1}-${end}`);
      mesh.position.set(hall.side * 4.736, 2.25, z);
      mesh.rotation.y = hall.side === -1 ? Math.PI / 2 : -Math.PI / 2;
      mesh.userData.hallIndex = hall.index;
    }
  }
  for (const { z, facing, top, halls } of directions) {
    const mesh = sign(8.8, .378125, { x: 0, y: top, width: 1024, height: 44 },
      `corridor-junction-${halls[0]}-${facing}`);
    mesh.position.set(0, 5.4, z + facing * .162);
    mesh.rotation.y = facing === 1 ? 0 : Math.PI;
    mesh.userData.halls = halls;
  }
  return signs;
}
