import * as T from '../../vendor/three.module.js';

// A three-metre concrete pour with fine aggregate, trowel variation and saw cuts.
export function createConcrete(own, anisotropy = 1) {
  const size = 256, colour = new Uint8Array(size * size * 4), relief = new Uint8Array(colour.length);
  let seed = 76193;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = (seed >>> 24) / 255;
    const joint = x < 1 || y < 1;
    const value = joint ? 82 : 143 + 5 * Math.sin(x / 29 + Math.sin(y / 41)) + 4 * Math.cos(y / 17) + noise * 9;
    const i = (y * size + x) * 4;
    colour.set([value, value - 2, value - 5, 255], i);
    const h = joint ? 55 : 153 + noise * 12;
    relief.set([h, h, h, 255], i);
  }
  const texture = (bytes, space) => {
    const map = own(new T.DataTexture(bytes, size, size));
    map.colorSpace = space; map.wrapS = map.wrapT = T.RepeatWrapping;
    map.generateMipmaps = true; map.minFilter = T.LinearMipmapLinearFilter;
    map.magFilter = T.LinearFilter; map.anisotropy = anisotropy; map.needsUpdate = true;
    return map;
  };
  const material = own(new T.MeshStandardMaterial({color:0xffffff,
    map:texture(colour,T.SRGBColorSpace), bumpMap:texture(relief,T.NoColorSpace),
    bumpScale:.008, roughness:.77, metalness:0}));
  material.name = 'industrial-concrete';
  return material;
}

export function furnishIndustrialRoom(hall, box, own) {
  const {x,z} = hall.center;
  const steel = own(new T.MeshStandardMaterial({color:0x30332f,metalness:.7,roughness:.6}));
  const bolts = own(new T.MeshStandardMaterial({color:0x777970,metalness:.8,roughness:.42}));
  const timber = own(new T.MeshStandardMaterial({color:0x504238,roughness:.88}));
  const light = own(new T.MeshStandardMaterial({color:0xe8e5dc,emissive:0xfff4df,emissiveIntensity:.45,roughness:.6}));
  // Formwork seams and tie plates sit between the two photograph bands.
  for (const y of [5.45,11.5]) {
    box(.008,.012,25.4,-26.805,y,z,bolts);
    for (const end of [-1,1]) box(21.4,.012,.008,x,y,z+end*12.805,bolts);
    for (let dz=-11;dz<=11;dz+=4) {
      box(.02,.14,.14,-26.795,y,z+dz,steel);
      box(.03,.035,.035,-26.78,y,z+dz,bolts);
    }
  }
  // Roof I-beams: web, top and bottom flange, end plates and fixing heads.
  for (const dz of [-9,0,9]) {
    box(21.5,.38,.07,x,12.55,z+dz,steel);
    for (const y of [12.34,12.76]) box(21.5,.035,.23,x,y,z+dz,steel);
    for (const dx of [-10.55,10.55]) {
      box(.055,.65,.48,x+dx,12.55,z+dz,steel);
      for (const dy of [-.23,.23]) for (const side of [-.16,.16])
        box(.075,.05,.05,x+dx,12.55+dy,z+dz+side,bolts);
    }
  }
  // Continuous service tray, with regularly spaced brackets and cross-bars.
  for (const dx of [-7.5,7.5]) {
    for (const side of [-.14,.14]) box(.025,.09,24,x+dx+side,11.95,z,steel);
    for (let dz=-11.5;dz<=11.5;dz+=.5) box(.3,.025,.025,x+dx,11.92,z+dz,steel);
    for (const dz of [-9,0,9]) box(.03,.55,.03,x+dx,12.2,z+dz,bolts);
    for (const dz of [-7,0,7]) {
      box(.11,.09,2.4,x+dx,11.72,z+dz,steel);
      box(.085,.012,2.3,x+dx,11.667,z+dz,light);
    }
  }
  // Exposed inner portal: its full five-metre opening stays clear.
  for (const dz of [-2.6,2.6]) box(.20,4.8,.13,-5.22,2.4,z+dz,steel);
  box(.20,.16,5.33,-5.22,4.8,z,steel);
  // Two timber benches on folded steel trestles, matching navigation footprints.
  for (const dz of [-4,4]) {
    for (const side of [-.26,0,.26]) box(3.2,.075,.245,x,.465,z+dz+side,timber);
    for (const dx of [-1.15,1.15]) {
      box(.06,.41,.64,x+dx,.215,z+dz,steel);
      box(.28,.035,.72,x+dx,.0175,z+dz,steel);
    }
  }
}
