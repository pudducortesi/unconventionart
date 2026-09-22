import { ROOM_FINISHES, addRoomWallFinishes } from './room-finishes.js';
import * as T from '../../vendor/three.module.js';
import { BUILDING, HALLS } from './layout.js';
import { CEILING_SCHEMES } from './lighting-layout.js';
import { createFloorLightmaps } from './baked-lighting.js';
import { createParquetData } from './parquet-data.js';
import { createStoneFloor } from './stone-floor.js';

// Architectural finishes; each texel is data generated here, not an artwork.
function floorFinish(own, anisotropy) {
  const { size, colour, normal, roughness } = createParquetData();
  const texture = (data, colorSpace = T.NoColorSpace) => {
    const map = own(new T.DataTexture(data, size, size, T.RGBAFormat));
    map.colorSpace = colorSpace;
    map.wrapS = map.wrapT = T.RepeatWrapping;
    map.magFilter = T.LinearFilter;
    map.minFilter = T.LinearMipmapLinearFilter;
    map.generateMipmaps = true;
    map.anisotropy = anisotropy;
    map.needsUpdate = true;
    return map;
  };
  return own(new T.MeshStandardMaterial({ color: 0xffffff,
    map: texture(colour, T.SRGBColorSpace), normalMap: texture(normal),
    roughnessMap: texture(roughness), roughness: 1, metalness: 0 }));
}

export function createInteriorEnvelope({ room, own, box, plaster, recess, glow, renderer }) {
  const anisotropy = Math.min(8, renderer.capabilities?.getMaxAnisotropy?.() ?? 1);
  const finishes = { mosaic: floorFinish(own, anisotropy), stone: createStoneFloor(own, anisotropy) };
  const floors = [];
  const surface = (width, depth, x, z, kind, name, regionId) => {
    const geometry = own(new T.PlaneGeometry(width, depth));
    const uv = geometry.attributes.uv;
    // Light and contact shade cover the whole room; wood retains its 3 m repeat.
    geometry.setAttribute('uv1', uv.clone());
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width / 3, uv.getY(i) * depth / 3);
    const finishMaterial = own(finishes[kind].clone());
    Object.assign(finishMaterial, createFloorLightmaps(own, regionId));
    const mesh = new T.Mesh(geometry, finishMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, -.003, z);
    mesh.name = name;
    mesh.receiveShadow = true;
    mesh.userData.walkable = true;
    room.add(mesh); floors.push(mesh);
  };
  surface(10, 140, 0, -60, 'stone', 'promenade-stone-floor', 'promenade');
  const h = BUILDING.height;
  const lining = own(new T.MeshStandardMaterial({color:0xbcb8ae, roughness:.85}));
  const opal = own(new T.MeshStandardMaterial({color:0xf3eee2, roughness:.72, emissive:0xfff0d7, emissiveIntensity:.22}));
  const trim = own(new T.MeshStandardMaterial({color:0xe3e1db, roughness:.38, metalness:.45}));
  for (const hall of HALLS) {
    const { x, z } = hall.center;
    const palette = ROOM_FINISHES[hall.index];
    const finish = palette.finish, ceiling = CEILING_SCHEMES[hall.index];
    surface(22, 26, x, z, finish, `${hall.id}-${finish}-floor`, hall.id);
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
