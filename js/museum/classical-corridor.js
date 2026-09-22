import * as T from '../../vendor/three.module.js';
import { HALLS, FURNITURE, BUILDING } from './layout.js';
const heightScale = BUILDING.height / 6.6;

// Elliptical barrel vault fitted below the existing roof. Geometry is shared
// by all ribs; no imported sculpture, fabricated artwork or extra light pool.
export function vaultGeometry(rx, rise, thickness, depth) {
  const positions = [], indices = [], segments = 64;
  for (let i = 0; i <= segments; i++) {
    const angle = i / segments * Math.PI;
    for (const z of [-depth / 2, depth / 2])
      for (const offset of [0, thickness])
        positions.push((rx + offset) * Math.cos(angle), (4.85 + (rise + offset) * Math.sin(angle)) * heightScale, z);
  }
  const quad = (a, b, c, d) => indices.push(a, b, c, a, c, d);
  for (let i = 0; i < segments; i++) {
    const a = i * 4, b = a + 4;
    quad(a, a + 2, b + 2, b); // inward-facing soffit
    quad(a + 1, b + 1, b + 3, a + 3);
    quad(a, b, b + 1, a + 1);
    quad(a + 2, a + 3, b + 3, b + 2);
  }
  quad(0, 1, 3, 2);
  const last = segments * 4; quad(last, last + 2, last + 3, last + 1);
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

export function furnishCorridor({ room, own, box }) {
  const paint = (color, roughness = .8, metalness = 0) => own(new T.MeshStandardMaterial({ color, roughness, metalness }));
  const ivory = paint(0xe6dfd1), stone = paint(0xf0e9dc), shadow = paint(0xb4a58e);
  const gold = paint(0x9d7842, .32, .65), dark = paint(0x302c27, .5);
  const lamp = own(new T.MeshStandardMaterial({ color: 0xffecd0, emissive: 0xffd69a, emissiveIntensity: .8 }));
  const targets = [];
  const place = (geometry, material, z, name) => {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.z = z; mesh.name = name;
    mesh.receiveShadow = true; mesh.castShadow = true;
    room.add(mesh); targets.push(mesh); return mesh;
  };
  place(own(vaultGeometry(4.82, 1.60, .025, 139.6)), ivory, -60, 'corridor-barrel-vault');
  const rib = own(vaultGeometry(4.60, 1.38, .16, .38));
  const bead = own(vaultGeometry(4.57, 1.35, .045, .055));
  for (let i = 0; i < 10; i++) {
    const z = -6.5 - i * 13;
    place(rib, stone, z, 'corridor-classical-arch');
    for (const end of [-1, 1]) place(bead, stone, z + end * .23, 'corridor-arch-moulding');
    for (const side of [-1, 1]) {
      // Pilasters stay behind the existing collision boundary at |x|=4.56.
      box(.22, 4.48 * heightScale - .30, .64, side * 4.73, (4.48 * heightScale + .30) / 2, z, stone);
      box(.26, .30, .80, side * 4.73, .15, z, stone);
      box(.28, .12, .84, side * 4.73, .36, z, stone);
      for (const dz of [-.21, -.105, 0, .105, .21])
        box(.012, 4.24 * heightScale - .56, .023, side * 4.613, (4.24 * heightScale + .56) / 2, z + dz, shadow);
      for (const [height, width, projection, y] of [[.14,.76,.28,4.52],[.12,.88,.38,4.65],[.13,1.0,.48,4.775]])
        box(projection, height * heightScale, width, side * 4.68, y * heightScale, z, stone);
      // Small picture-light fittings; warm lighting comes from the bounded pool.
      box(.18, .12, .32, side * 4.60, 4.36 * heightScale, z + .85, dark);
      box(.025, .045, .23, side * 4.501, 4.32 * heightScale, z + .85, lamp);
    }
  }
  for (const side of [-1, 1]) {
    // Layered entablature and dentils replace the modern illuminated rails.
    for (const [w,h,y] of [[.24,.16,4.60],[.38,.10,4.73],[.48,.10,4.84]])
      box(w,h * heightScale,139.6,side*4.72,y * heightScale,-60,stone);
    for (let z = 9.4; z > -129.5; z -= .55)
      box(.25,.09 * heightScale,.16,side*4.68,4.63 * heightScale,z,stone);
  }
  // Longitudinal mouldings outline the curved ceiling panels.
  for (const angle of [Math.PI/5, Math.PI*2/5, Math.PI*3/5, Math.PI*4/5])
    box(.035,.04,139.5,4.79*Math.cos(angle),(4.85+1.55*Math.sin(angle))*heightScale,-60,stone);

  for (const hall of HALLS) {
    const side = hall.side, z = hall.center.z;
    for (const end of [-1, 1]) {
      // Painted wall fields and classical dado; openings retain their width.
      box(.022,4.85*heightScale,10.25,side*4.822,2.425*heightScale,z+end*7.72,ivory);
      box(.06,.38,10.2,side*4.80,.19,z+end*7.75,stone);
      box(.075,.065,10.2,side*4.795,.405,z+end*7.75,stone);
      box(.16,4.46,.16,side*4.75,2.23,z+end*2.62,stone);
      // Raised rectangular wall mouldings, not invented historical paintings.
      const panel = z + end * 9.4;
      for (const edge of [-1,1]) {
        box(.055,3.15,.055,side*4.79,2.28,panel+edge*1.3,gold);
        box(.055,.055,2.65,side*4.79,2.28+edge*1.575,panel,gold);
      }
    }
    box(.17,.22,5.40,side*4.75,4.45,z,stone);
    box(.022,BUILDING.height-4.7,5.0,side*4.817,(BUILDING.height+4.7)/2,z,ivory);
  }
  for (const bench of FURNITURE.filter(piece => piece.kind === 'corridor-bench')) {
    box(bench.width,.10,bench.depth,bench.x,bench.height-.05,bench.z,dark);
    for (const end of [-1,1]) box(bench.width-.12,.36,.18,bench.x,.18,bench.z+end*(bench.depth/2-.25),stone);
  }
  // Discreet ivory plaques retain room identification without overhead banners.
  const canvas = document.createElement('canvas'); canvas.width=512; canvas.height=1024;
  const ctx=canvas.getContext('2d'); ctx.fillStyle='#e6dfd1'; ctx.fillRect(0,0,512,1024);
  for (const hall of HALLS) {
    const y=hall.index*100; ctx.fillStyle='#443b30'; ctx.font='40px serif';
    ctx.fillText(String(hall.index+1).padStart(2,'0'),20,y+60);
    ctx.font='25px serif'; ctx.fillText(hall.profile.name,110,y+57);
  }
  const texture=own(new T.CanvasTexture(canvas)); texture.colorSpace=T.SRGBColorSpace;
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
  return targets;
}
