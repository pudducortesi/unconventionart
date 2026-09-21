import { ROOM_FINISHES, addRoomWallFinishes } from './room-finishes.js';
import * as T from '../../vendor/three.module.js';
import { BUILDING, HALLS } from './layout.js';

// Architectural finishes; each texel is data generated here, not an artwork.
function floorFinish(own, kind, anisotropy) {
  const size = 512, pixels = new Uint8Array(size * size * 4);
  // A seamless 3 x 3 m module: 16 staggered 18.75 cm boards, 1.5 m long.
  // Grain and joints live in one shared texture, without extra floor geometry.
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const row = Math.floor(x / 32), across = x % 32;
    const along = (y + (row % 2) * 128) % 256;
    const segment = Math.floor(((y + (row % 2) * 128) % 512) / 256);
    const board = Math.sin(row * 37.1 + segment * 19.7) * 6;
    const wave = Math.sin(y * Math.PI / 256 + row) * 1.4;
    const grain = Math.sin(across * 2.3 + wave) * 2.3 + Math.sin(across * .65 + wave) * 3;
    const pore = Math.sin(x * 41.3 + y * 17.7) * 1.2;
    const joint = across === 0 || along === 0;
    const bevel = across === 1 || across === 31 || along === 1 || along === 255;
    const variation = board + grain + pore - (bevel ? 5 : 0);
    const index = (y * size + x) * 4;
    pixels[index] = joint ? 32 : 85 + variation;
    pixels[index+1] = joint ? 16 : 42 + variation * .62;
    pixels[index+2] = joint ? 12 : 28 + variation * .4;
    pixels[index+3] = 255;
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
    bumpMap: map, bumpScale: .003, roughness: .48, metalness: 0 }));
}

export function createInteriorEnvelope({ room, own, box, plaster, recess, glow, renderer }) {
  const anisotropy = Math.min(8, renderer.capabilities?.getMaxAnisotropy?.() ?? 1);
  const finishes = Object.fromEntries(['mahogany'].map(kind => [kind, floorFinish(own, kind, anisotropy)]));
  const floors = [];
  const surface = (width, depth, x, z, kind, name, colour) => {
    const geometry = own(new T.PlaneGeometry(width, depth));
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width / 3, uv.getY(i) * depth / 3);
    const finishMaterial = colour === undefined ? finishes[kind] : own(finishes[kind].clone());
    if (colour !== undefined) finishMaterial.color.setHex(colour);
    const mesh = new T.Mesh(geometry, finishMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, -.003, z);
    mesh.name = name;
    mesh.receiveShadow = true;
    mesh.userData.walkable = true;
    room.add(mesh); floors.push(mesh);
  };
  surface(10, 140, 0, -60, 'mahogany', 'promenade-mahogany-floor');
  const plans = [
    ['terrazzo', 'coffers'], ['stone', 'fins'], ['resin', 'coffers'],
    ['resin', 'rafts'], ['terrazzo', 'rafts'], ['resin', 'rafts'],
    ['stone', 'fins'], ['stone', 'coffers'], ['terrazzo', 'rafts'], ['terrazzo', 'fins'],
  ];
  const h = BUILDING.height;
  const lining = own(new T.MeshStandardMaterial({color:0xbcb8ae, roughness:.85}));
  const opal = own(new T.MeshStandardMaterial({color:0xf3eee2, roughness:.72, emissive:0xfff0d7, emissiveIntensity:.22}));
  const trim = own(new T.MeshStandardMaterial({color:0xe3e1db, roughness:.38, metalness:.45}));
  for (const hall of HALLS) {
    const { x, z } = hall.center;
    const palette = ROOM_FINISHES[hall.index];
    const finish = palette.finish, ceiling = plans[hall.index][1];
    surface(22, 26, x, z, finish, `${hall.id}-${finish}-floor`);
    const wallPaint = own(plaster.clone()); wallPaint.color.setHex(palette.wall);
    const accentPaint = own(plaster.clone()); accentPaint.color.setHex(palette.accent);
    const ceilingPaint = own(plaster.clone()); ceilingPaint.color.setHex(palette.ceiling);
    const skirting = own(new T.MeshStandardMaterial({color: palette.trim, roughness: .6}));
    addRoomWallFinishes(hall, box, wallPaint, accentPaint, skirting);
    // Continuous coloured soffit behind the room's coffers, fins or rafts.
    box(21.62, .025, 25.62, x, h - .035, z, ceilingPaint);
    // Shadow gaps and concealed light establish thickness around the ceiling.
    for (const dx of [-9.7, 9.7]) {
      box(.14, .04, 23.4, x + dx, h - .25, z, recess);
      box(.035, .012, 23, x + dx - Math.sign(dx) * .12, h - .28, z, glow);
    }
    for (const dz of [-11.7, 11.7]) box(19.5, .04, .14, x, h - .25, z + dz, recess);
    if (ceiling === 'coffers') {
      // Six deep rooflight wells, with structural white rims and diffusers.
      for (const dx of [-4.65, 4.65]) for (const dz of [-7.2, 0, 7.2]) {
        box(7.7, .05, 5.9, x + dx, h - .12, z + dz, lining);
        box(7.25, .025, 5.45, x + dx, h - .16, z + dz, opal);
        for (const mullion of [-2.4, 0, 2.4]) box(.035,.05,5.5,x+dx+mullion,h-.205,z+dz,trim);
        for (const side of [-1, 1]) {
          box(.2, .42, 6.1, x + dx + side * 3.85, h - .3, z + dz, ceilingPaint);
          box(7.9, .42, .2, x + dx, h - .3, z + dz + side * 2.95, ceilingPaint);
        }
      }
    } else if (ceiling === 'fins') {
      // A central acoustic field leaves the perimeter quiet for photographs.
      box(13.6, .04, 20.4, x, h - .12, z, lining);
      for (const dz of [-8.6,0,8.6]) box(13.4,.085,.06,x,h-.20,z+dz,trim);
      for (let dx = -6.4; dx <= 6.4; dx += .8)
        for (const dz of [-6.72,0,6.72]) box(.10, .34, 6.65, x + dx, h - .35, z + dz, ceilingPaint);
      for (const dx of [-7.2, 7.2]) box(.08, .025, 19.8, x + dx, h - .3, z, glow);
    } else {
      // Suspended acoustic rafts, shallow hangers and a recessed glowing reveal.
      for (const dz of [-6, 5.8]) {
        box(13.8, .03, 7.8, x, h - .15, z + dz, recess);
        // Modular acoustic panels with real open joints and a recessed perimeter.
        for (const edge of [-1,1]) box(12.7,.02,.035,x,h-.24,z+dz+edge*3.55,opal);
        box(12.9,.04,6.9,x,h-.30,z+dz,lining);
        for (const dx of [-5.375,-3.225,-1.075,1.075,3.225,5.375]) for (const row of [-1.725,1.725])
          box(2.13,.15,3.43,x+dx,h-.43,z+dz+row,ceilingPaint);
        for (const dx of [-5.5, 5.5]) for (const end of [-2.6, 2.6])
          box(.025, .3, .025, x + dx, h - .25, z + dz + end, recess);
      }
    }
  }
  return floors;
}
