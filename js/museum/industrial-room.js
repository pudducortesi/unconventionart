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

// Multiscale mineral wear; all coordinates tile without hard texture seams.
export function createWornPlaster(own) {
  const size = 256, colour = new Uint8Array(size * size * 4), bump = new Uint8Array(colour.length);
  const hash = (x,y) => ((Math.imul(x+913,374761393)^Math.imul(y+71,668265263))>>>0)/4294967295;
  const noise = (x,y,n) => {
    const px=x/size*n, py=y/size*n, ix=Math.floor(px), iy=Math.floor(py);
    let u=px-ix,v=py-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);
    const a=hash(ix%n,iy%n),b=hash((ix+1)%n,iy%n),c=hash(ix%n,(iy+1)%n),d=hash((ix+1)%n,(iy+1)%n);
    return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
  };
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const field=noise(x,y,5)*.5+noise(x,y,13)*.3+noise(x,y,43)*.2;
    // Continuous tonal wear avoids the hard, camouflage-like threshold.
    const grain=(hash(x,y)-.5)*4;
    const value=184+field*22+grain;
    const i=(y*size+x)*4, height=135+field*30+grain;
    colour.set([value,value-8,value-18,255],i);bump.set([height,height,height,255],i);
  }
  const map=(bytes,space)=>{
    const t=own(new T.DataTexture(bytes,size,size));t.colorSpace=space;
    t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(4,2);
    t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.needsUpdate=true;
    return t;
  };
  return {map:map(colour,T.SRGBColorSpace),bumpMap:map(bump,T.NoColorSpace),bumpScale:.005};
}

export function furnishIndustrialRoom(hall, box, own, room) {
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
  // Galvanised ducts and pendant shades share instanced geometry and materials.
  const cylinder = own(new T.CylinderGeometry(1,1,1,16));
  const shade = own(new T.CylinderGeometry(.065,.12,.23,16));
  const batches = new Map();
  const transform = new T.Object3D();
  const part=(geometry,material,px,py,pz,sx,sy,sz,rx=0)=>{
    const key=geometry.uuid+material.uuid;
    if(!batches.has(key))batches.set(key,{geometry,material,matrices:[]});
    transform.position.set(px,py,pz);transform.rotation.set(rx,0,0);transform.scale.set(sx,sy,sz);transform.updateMatrix();
    batches.get(key).matrices.push(transform.matrix.clone());
  };
  const zinc=own(new T.MeshStandardMaterial({color:0x9a9e99,metalness:.82,roughness:.48}));
  for(const dx of [-5.7,5.7]) {
    part(cylinder,zinc,x+dx,12.05,z,.24,24,.24,Math.PI/2);
    for(let dz=-11.7;dz<12;dz+=1.2)part(cylinder,bolts,x+dx,12.05,z+dz,.253,.025,.253,Math.PI/2);
    for(const dz of [-9,0,9])box(.025,.52,.035,x+dx,12.55,z+dz,steel);
  }
  for(const dx of [-6,0,6])for(const dz of [-8,0,8]) {
    const y=dx===0?10.15:10.65;
    part(cylinder,steel,x+dx,(12.8+y+.13)/2,z+dz,.006,12.8-y-.13,.006);
    part(shade,steel,x+dx,y,z+dz,1,1,1);
    part(cylinder,light,x+dx,y-.114,z+dz,.103,.008,.103);
  }
  for(const {geometry,material,matrices} of batches.values()) {
    const mesh=new T.InstancedMesh(geometry,material,matrices.length);
    matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;
    mesh.name='officina-suspended-services';mesh.receiveShadow=true;mesh.computeBoundingSphere();room.add(mesh);
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
