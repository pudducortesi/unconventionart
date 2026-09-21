import * as T from '../../vendor/three.module.js';
import { BUILDING, HALLS } from './layout.js';

// White architectural finishes; each texel is data generated here, not an artwork.
function floorFinish(own, kind, anisotropy) {
  const size = 512, pixels = new Uint8Array(size * size * 4);
  let seed = 781;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const random = seed / 4294967296;
    const cloud = Math.sin(x * .043) * Math.sin(y * .027) * 1.4;
    let value = 242 + cloud + (random - .5) * 3;
    if (kind === 'terrazzo' && random > .94) value -= 10 + random * 8;
    if (kind === 'stone') value += Math.sin(x * .025 + Math.sin(y * .02) * 3) * 2;
    // 3m module; 6mm recessed seam with a quiet bevel, no overlapping geometry.
    const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
    if (kind !== 'resin' && edge < 1) value = 212;
    else if (kind !== 'resin' && edge < 2) value -= 5;
    pixels.set([value, value, value, 255], (y * size + x) * 4);
  }
  const map = own(new T.DataTexture(pixels, size, size, T.RGBAFormat));
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.magFilter = T.LinearFilter;
  map.minFilter = T.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.anisotropy = anisotropy;
  map.needsUpdate = true;
  return own(new T.MeshStandardMaterial({ map, color: 0xffffff,
    roughness: kind === 'resin' ? .48 : kind === 'stone' ? .58 : .36, metalness: 0 }));
}

export function createInteriorEnvelope({ room, own, box, plaster, recess, glow, renderer }) {
  const anisotropy = Math.min(8, renderer.capabilities?.getMaxAnisotropy?.() ?? 1);
  const finishes = Object.fromEntries(['terrazzo', 'stone', 'resin'].map(kind => [kind, floorFinish(own, kind, anisotropy)]));
  const floors = [];
  const surface = (width, depth, x, z, kind, name) => {
    const geometry = own(new T.PlaneGeometry(width, depth));
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width / 3, uv.getY(i) * depth / 3);
    const mesh = new T.Mesh(geometry, finishes[kind]);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, -.003, z);
    mesh.name = name;
    mesh.receiveShadow = true;
    mesh.userData.walkable = true;
    room.add(mesh); floors.push(mesh);
  };
  surface(10, 140, 0, -60, 'stone', 'promenade-stone-floor');
  const plans = [
    ['terrazzo', 'coffers'], ['stone', 'fins'], ['resin', 'coffers'],
    ['resin', 'rafts'], ['terrazzo', 'rafts'], ['resin', 'rafts'],
    ['stone', 'fins'], ['stone', 'coffers'], ['terrazzo', 'rafts'], ['terrazzo', 'fins'],
  ];
  const h = BUILDING.height;
  for (const hall of HALLS) {
    const { x, z } = hall.center;
    const [finish, ceiling] = plans[hall.index];
    surface(22, 26, x, z, finish, `${hall.id}-${finish}-floor`);
    // Shadow gaps and concealed light establish thickness around the ceiling.
    for (const dx of [-9.7, 9.7]) {
      box(.14, .04, 23.4, x + dx, h - .25, z, recess);
      box(.035, .012, 23, x + dx - Math.sign(dx) * .12, h - .28, z, glow);
    }
    for (const dz of [-11.7, 11.7]) box(19.5, .04, .14, x, h - .25, z + dz, recess);
    if (ceiling === 'coffers') {
      // Six deep rooflight wells, with structural white rims and diffusers.
      for (const dx of [-4.65, 4.65]) for (const dz of [-7.2, 0, 7.2]) {
        box(7.7, .05, 5.9, x + dx, h - .12, z + dz, recess);
        box(7.25, .025, 5.45, x + dx, h - .16, z + dz, glow);
        for (const side of [-1, 1]) {
          box(.2, .42, 6.1, x + dx + side * 3.85, h - .3, z + dz, plaster);
          box(7.9, .42, .2, x + dx, h - .3, z + dz + side * 2.95, plaster);
        }
      }
    } else if (ceiling === 'fins') {
      // A central acoustic field leaves the perimeter quiet for photographs.
      box(13.6, .04, 20.4, x, h - .12, z, recess);
      for (let dx = -6.4; dx <= 6.4; dx += .8)
        box(.12, .38, 20, x + dx, h - .35, z, plaster);
      for (const dx of [-7.2, 7.2]) box(.08, .025, 19.8, x + dx, h - .3, z, glow);
    } else {
      // Suspended acoustic rafts, shallow hangers and a recessed glowing reveal.
      for (const dz of [-6, 5.8]) {
        box(13.8, .03, 7.8, x, h - .15, z + dz, recess);
        box(13.3, .025, 7.3, x, h - .2, z + dz, glow);
        box(12.9, .18, 6.9, x, h - .43, z + dz, plaster);
        for (const dx of [-5.5, 5.5]) for (const end of [-2.6, 2.6])
          box(.025, .3, .025, x + dx, h - .25, z + dz + end, recess);
      }
    }
  }
  return floors;
}
