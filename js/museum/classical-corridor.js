import * as T from '../../vendor/three.module.js';
import { HALLS, FURNITURE, BUILDING } from './layout.js';
import { createPalazzoOrnaments } from './palazzo-ornaments.js';
const heightScale = BUILDING.height / 6.6;

// The existing elliptical shell preserves the clear height/collision plan.
// Fresco UVs cover each 13 m bay instead of stretching for the full 140 m.
export function vaultGeometry(rx, rise, thickness, depth) {
  const positions = [], uv = [], indices = [], segments = 64;
  for (let i = 0; i <= segments; i++) {
    const angle = i / segments * Math.PI;
    for (const z of [-depth / 2, depth / 2]) {
      for (const offset of [0, thickness]) {
        positions.push((rx + offset) * Math.cos(angle), (4.85 + (rise + offset) * Math.sin(angle)) * heightScale, z);
        uv.push(i / segments, (z + depth / 2) / 13);
      }
    }
  }
  const quad = (a, b, c, d) => indices.push(a, b, c, a, c, d);
  for (let i = 0; i < segments; i++) {
    const a = i * 4, b = a + 4;
    quad(a, a + 2, b + 2, b);
    quad(a + 1, b + 1, b + 3, a + 3);
    quad(a, b, b + 1, a + 1);
    quad(a + 2, a + 3, b + 3, b + 2);
  }
  quad(0, 1, 3, 2);
  const last = segments * 4; quad(last, last + 2, last + 3, last + 1);
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

export function furnishCorridor({ room, own, box, renderer, onReady = () => {} }) {
  const paint = (color, roughness = .8, metalness = 0) => own(new T.MeshStandardMaterial({ color, roughness, metalness }));
  const ivory = paint(0xd9c9aa), stone = paint(0xeee0c6, .48), shadow = paint(0xa5916d);
  const gold = paint(0xd5ad58, .27, .74), antiqueGold = paint(0x96702c, .4, .62);
  const dark = paint(0x211d19, .42), velvet = paint(0x741e2e, .95);
  const crystal = own(new T.MeshPhysicalMaterial({ color: 0xe4ece9, roughness: .09,
    metalness: .16, clearcoat: 1, emissive: 0xcdd8dc, emissiveIntensity: .14 }));
  const candle = own(new T.MeshStandardMaterial({ color: 0xfff5d9, emissive: 0xffdf9d,
    emissiveIntensity: 1.3, roughness: .4 }));
  const targets = [], textured = new Map(), failed = new Set();
  const textureMaterial = (path, options, fallback) => {
    const texture = own(new T.TextureLoader().load(path, onReady, undefined, () => {
      failed.add(path);
      for (const material of textured.get(path) || []) {
        material.map = null; material.emissiveMap = null;
        material.color.setHex(fallback); material.emissiveIntensity = 0;
        material.needsUpdate = true;
      }
      onReady();
    }));
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
    const material = own(new T.MeshStandardMaterial({ ...options,
      color: failed.has(path) ? fallback : 0xffffff,
      map: failed.has(path) ? null : texture,
      emissiveMap: failed.has(path) ? null : texture,
      emissiveIntensity: failed.has(path) ? 0 : options.emissiveIntensity,
    }));
    if (!textured.has(path)) textured.set(path, []);
    textured.get(path).push(material);
    return material;
  };
  const fresco = textureMaterial('/images/palazzo/fresco-vault.webp', {
    roughness: .92, emissive: 0xffffff, emissiveIntensity: .24,
  }, 0xd9c9aa);
  const paintings = textureMaterial('/images/palazzo/paintings-atlas.webp', {
    roughness: .75, emissive: 0xffffff, emissiveIntensity: .12,
  }, 0x4a3725);
  const ornaments = createPalazzoOrnaments({ room, own, gold, ivory: stone, crystal, candle });
  const place = (geometry, material, z, name) => {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.z = z; mesh.name = name;
    mesh.receiveShadow = true; mesh.castShadow = true;
    room.add(mesh); targets.push(mesh); return mesh;
  };
  place(own(vaultGeometry(4.82, 1.60, .025, 139.6)), ivory, -60, 'corridor-plaster-vault');
  // One fresco, in one complete bay; no repeated or stretched imagery.
  place(own(vaultGeometry(4.81, 1.59, .005, 13)), fresco, -13, 'corridor-barrel-vault');
  const rib = own(vaultGeometry(4.60, 1.38, .16, .38));
  const bead = own(vaultGeometry(4.57, 1.35, .035, .065));
  for (let i = 0; i < 10; i++) {
    const z = -6.5 - i * 13;
    place(rib, stone, z, 'corridor-classical-arch');
    for (const end of [-1, 1]) place(bead, gold, z + end * .23, 'corridor-gilded-arch-moulding');
    for (let j = 1; j < 15; j++) {
      const angle = j / 15 * Math.PI;
      ornaments.add('bead', 'gold', 4.59 * Math.cos(angle),
        (4.85 + 1.365 * Math.sin(angle)) * heightScale - .025, z, .075, .047, .095);
    }
    for (const side of [-1, 1]) {
      // Shafts remain outside |x|=4.56 at walking level.
      box(.22, 8.35, .66, side * 4.73, 4.555, z, stone);
      box(.28, .30, .82, side * 4.73, .15, z, stone);
      box(.30, .12, .86, side * 4.72, .36, z, gold);
      box(.025, 7.88, .47, side * 4.611, 4.53, z, ivory);
      for (const dz of [-.21, -.105, 0, .105, .21])
        box(.012, 7.80, .023, side * 4.590, 4.54, z + dz, shadow);
      for (const [height, width, projection, y, surface] of [
        [.13,.74,.29,8.69,gold], [.20,.88,.38,9.03,stone],
        [.10,1.0,.46,9.21,gold], [.15,1.06,.48,9.45,gold],
      ]) box(projection, height, width, side * 4.69, y, z, surface);
      for (const dz of [-.25, 0, .25]) ornaments.wallLeaf(side,4.48,8.48,z+dz,.27);
      for (const end of [-1,1]) ornaments.wallCurl(side,4.43,8.97,z+end*.38,.16,end*.5);
    }
  }
  for (const side of [-1, 1]) {
    // Deep frieze behind continuous gold entablature, dentils and foliage.
    for (const [w,h,y,surface] of [
      [.25,.17,9.04,antiqueGold], [.32,.065,9.16,gold], [.37,.26,9.34,dark],
      [.43,.07,9.50,gold], [.49,.10,9.62,gold], [.48,.055,9.74,stone],
    ]) box(w,h,139.6,side*4.70,y,-60,surface);
    for (let z = 9.4; z > -129.5; z -= .48)
      box(.34,.12,.135,side*4.64,9.19,z,gold);
    for (let z = 9.2; z > -129.3; z -= 1.3) {
      ornaments.wallLeaf(side,4.485,9.225,z,.18,-.55);
      ornaments.wallLeaf(side,4.485,9.225,z+.32,.18,.55);
      ornaments.add('bead','gold',side*4.472,9.39,z+.16,.035,.062,.062);
    }
  }
  for (const angle of [Math.PI/5, Math.PI*2/5, Math.PI*3/5, Math.PI*4/5])
    box(.04,.045,139.5,4.79*Math.cos(angle),(4.85+1.55*Math.sin(angle))*heightScale,-60,gold);

  // Each atlas subject is shown once. The axial painting reserves cell 2.
  const paintingGeometry = Array.from({ length: 4 }, (_, index) => {
    const geometry=own(new T.PlaneGeometry(1,1)),uv=geometry.attributes.uv;
    const column=index%2,row=Math.floor(index/2),inset=2/1024;
    for (let i=0;i<uv.count;i++) uv.setXY(i,
      column*.5+inset+uv.getX(i)*(.5-2*inset),
      (1-row)*.5+inset+uv.getY(i)*(.5-2*inset));
    return geometry;
  });
  const usedSubjects = new Set([2]);
  const panelGeometry = own(new T.PlaneGeometry(1,1));
  const wallPainting = (side,z,y,width,height,variant) => {
    box(.08,height+.44,width+.44,side*4.76,y,z,dark);
    for (const end of [-1,1]) {
      box(.22,height+.48,.20,side*4.69,y,z+end*(width/2+.14),antiqueGold);
      box(.22,.20,width+.48,side*4.69,y+end*(height/2+.14),z,antiqueGold);
      box(.245,height+.49,.065,side*4.689,y,z+end*(width/2+.23),gold);
      box(.245,.065,width+.49,side*4.689,y+end*(height/2+.23),z,gold);
      box(.20,height+.12,.05,side*4.70,y,z+end*(width/2+.025),gold);
      box(.20,.05,width+.12,side*4.70,y+end*(height/2+.025),z,gold);
      for (let dy=-height/2;dy<=height/2;dy+=.30)
        ornaments.add('bead','gold',side*4.600,y+dy,z+end*(width/2+.135),.034,.056,.038);
      for (let dz=-width/2;dz<=width/2;dz+=.30)
        ornaments.add('bead','gold',side*4.600,y+end*(height/2+.135),z+dz,.034,.038,.056);
      for (const edge of [-1,1])
        ornaments.wallLeaf(side,4.575,y+end*(height/2+.11),z+edge*(width/2+.12),.15,end<0?Math.PI:0);
    }
    const subject = variant % 4;
    const unique = !usedSubjects.has(subject);
    usedSubjects.add(subject);
    const mesh=new T.Mesh(unique ? paintingGeometry[subject] : panelGeometry, unique ? paintings : ivory);
    if (unique) mesh.userData.decorativeSubject = subject;
    mesh.position.set(side*4.67,y,z); mesh.scale.set(width,height,1);
    mesh.rotation.y=side===-1?Math.PI/2:-Math.PI/2;
    mesh.name=unique ? 'palazzo-painting' : 'palazzo-stucco-panel'; mesh.userData.decorative=true;
    room.add(mesh); targets.push(mesh);
  };
  for (const hall of HALLS) {
    const side=hall.side,z=hall.center.z;
    for (const end of [-1,1]) {
      box(.022,9.7,10.25,side*4.822,4.85,z+end*7.72,ivory);
      box(.08,.43,10.2,side*4.79,.215,z+end*7.75,stone);
      box(.085,.06,10.2,side*4.785,.455,z+end*7.75,gold);
      box(.16,4.60,.18,side*4.75,2.30,z+end*2.62,stone);
      box(.18,4.57,.038,side*4.725,2.32,z+end*2.70,gold);
      wallPainting(side,z+end*9.4,2.91,4.05,3.46,hall.index+(end+1)/2);
      wallPainting(side,z+end*9.4,7.03,4.05,3.15,hall.index+(end+1)/2+2);
    }
    // Door head decoration stays above the existing 5 m wide opening.
    box(.17,.20,5.40,side*4.75,4.62,z,stone);
    box(.022,BUILDING.height-4.7,5.0,side*4.817,(BUILDING.height+4.7)/2,z,ivory);
    box(.24,.09,5.5,side*4.71,4.77,z,gold);
    wallPainting(side,z,7.03,3.75,3.15,hall.index+1);
    ornaments.wallCurl(side,4.48,5.03,z-.34,.22,.4);
    ornaments.wallCurl(side,4.48,5.03,z+.34,.22,-.4);
    ornaments.add('bead','gold',side*4.45,5.13,z,.06,.23,.18);
    ornaments.wallLeaf(side,4.43,5.12,z,.20);
  }
  for (const bench of FURNITURE.filter(piece=>piece.kind==='corridor-bench')) {
    box(bench.width,.12,bench.depth,bench.x,bench.height-.06,bench.z,velvet);
    box(bench.width-.035,.075,bench.depth-.035,bench.x,bench.height-.158,bench.z,gold);
    for (const end of [-1,1]) {
      box(bench.width-.14,.29,.15,bench.x,.145,bench.z+end*(bench.depth/2-.22),antiqueGold);
      ornaments.wallCurl(1,bench.x-bench.width/2+.04,.18,bench.z+end*(bench.depth/2-.20),.115,end*.6);
    }
  }
  // Side chandeliers leave the axial view and all ground-level routes open.
  for (let i=0;i<5;i++) for (const side of [-1,1])
    ornaments.chandelier(side*3.40,-6.5-i*26);

  const endCanvas=new T.Mesh(paintingGeometry[2],paintings);
  endCanvas.position.set(0,4.6,-129.70); endCanvas.scale.set(4.9,5.8,1);
  endCanvas.name='palazzo-axial-painting'; endCanvas.userData.decorative=true; endCanvas.userData.decorativeSubject=2;
  room.add(endCanvas); targets.push(endCanvas);
  for (const edge of [-1,1]) {
    box(.20,6.25,.22,edge*2.62,4.6,-129.66,gold);
    box(5.45,.20,.22,0,4.6+edge*3.025,-129.66,gold);
    box(.06,6.10,.25,edge*2.50,4.6,-129.655,antiqueGold);
    box(5.15,.06,.25,0,4.6+edge*2.92,-129.655,antiqueGold);
  }

  // Fourfold text resolution for close-up reading; share one atlas across all
  // twenty signs, with anisotropic filtering for oblique corridor views.
  const canvas=document.createElement('canvas'); canvas.width=2048; canvas.height=4096;
  const ctx=canvas.getContext('2d'); ctx.fillStyle='#e6dfd1'; ctx.fillRect(0,0,2048,4096);
  for (const hall of HALLS) {
    const y=hall.index*400; ctx.fillStyle='#443b30'; ctx.font='160px serif';
    ctx.fillText(String(hall.index+1).padStart(2,'0'),80,y+240);
    ctx.font='100px serif'; ctx.fillText(hall.profile.name,440,y+228);
  }
  const texture=own(new T.CanvasTexture(canvas)); texture.colorSpace=T.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  const material=own(new T.MeshBasicMaterial({map:texture,toneMapped:false}));
  for (const hall of HALLS) for (const end of [-1,1]) {
    const geometry=own(new T.PlaneGeometry(1.8,.352));
    const uv=geometry.attributes.uv;
    for(let i=0;i<uv.count;i++) uv.setY(i,1-(hall.index*100+(1-uv.getY(i))*100)/1024);
    const mesh=new T.Mesh(geometry,material);
    mesh.name=`corridor-room-${hall.index+1}-${end}`; mesh.userData.hallIndex=hall.index;
    mesh.position.set(hall.side*4.79,2.15,hall.center.z+end*3.85);
    mesh.rotation.y=hall.side===-1?Math.PI/2:-Math.PI/2;
    room.add(mesh);targets.push(mesh);
  }
  targets.push(...ornaments.finish());
  return targets;
}
