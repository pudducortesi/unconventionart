import * as T from "../../vendor/three.module.js";
import { FURNITURE } from "./layout.js";

// Lightweight interpretations of the supplied furniture photographs, in white.
// Parts are instanced across the museum; no external models or image textures.
export function createDesignSeating(room, own) {
  const leather = own(new T.MeshStandardMaterial({ color: 0xfaf9f6, roughness: 0.48 }));
  const frame = own(new T.MeshStandardMaterial({ color: 0xf2f3f3, roughness: 0.24, metalness: 0.18 }));
  const lacquer = own(new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32 }));
  const seam = own(new T.MeshStandardMaterial({ color: 0xdeddd9, roughness: 0.75 }));
  const cube = own(new T.BoxGeometry(1, 1, 1));
  const pillow = own(new T.BoxGeometry(1, 1, 1, 4, 4, 4));
  const position = pillow.attributes.position;
  const v = new T.Vector3(), inner = new T.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    inner.copy(v).clampScalar(-0.38, 0.38);
    v.sub(inner).normalize().multiplyScalar(0.12).add(inner);
    position.setXYZ(i, v.x, v.y, v.z);
  }
  pillow.computeVertexNormals();
  const cylinder = own(new T.CylinderGeometry(1, 1, 1, 24));
  const sphere = own(new T.SphereGeometry(1, 12, 8));
  const geometries = new Map();
  const batches = new Map();
  let origin;
  const add = (geometry, material, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
    const key = `${geometry.uuid}/${material.uuid}`;
    if (!batches.has(key)) batches.set(key, { geometry, material, parts: [] });
    const matrix = new T.Matrix4().compose(new T.Vector3(origin.x + x, y, origin.z + z),
      new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(sx, sy, sz));
    batches.get(key).parts.push(matrix);
  };
  const box = (x,y,z,w,h,d,mat=frame,rx=0) => add(cube,mat,x,y,z,w,h,d,rx);
  const pad = (x,y,z,w,h,d,rx=0) => add(pillow,leather,x,y,z,w,h,d,rx);
  const tube = (name, points, radius=0.022) => {
    if (!geometries.has(name)) geometries.set(name, own(new T.TubeGeometry(
      new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))), 32, radius, 8, false)));
    add(geometries.get(name), frame, 0,0,0);
  };
  const legs = (w,d,h) => {for(const x of [-w/2,w/2]) for(const z of [-d/2,d/2]) box(x,h/2,z,0.035,h,0.035);};
  const tuft = (w,d,y,z=0,rows=4,cols=5) => {
    pad(0,y,z,w,0.14,d);
    for(let i=0;i<cols;i++)for(let j=0;j<rows;j++)pad((i-(cols-1)/2)*w/cols,y+0.065,z+(j-(rows-1)/2)*d/rows,w/cols-0.014,0.065,d/rows-0.014);
    for(let i=1;i<cols;i++)for(let j=1;j<rows;j++)add(sphere,seam,(i-cols/2)*w/cols,y+0.095,z+(j-rows/2)*d/rows,0.014,0.008,0.014);
  };
  const models = {
    bibendum() {
      pad(0,0.43,0,1.02,0.28,0.92);
      for(const y of [0.72,1.02]) {
        const points=[[-0.5,y,-0.3],[-0.53,y,0.12],[-0.40,y,0.39],[0,y,0.46],[0.40,y,0.39],[0.53,y,0.12],[0.5,y,-0.3]];
        const key=`roll-${y}`;
        if (!geometries.has(key)) geometries.set(key, own(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),40,0.16,12,false)));
        const geometry=geometries.get(key);
        add(geometry,leather,0,0,0);
        for(const x of [-0.5,0.5]) add(sphere,leather,x,y,-0.3,0.16,0.16,0.06);
      }
      tube('bibendum-base',[[-0.48,0.29,-0.35],[-0.48,0.04,-0.4],[0,0.04,0.4],[0.48,0.04,-0.4],[0.48,0.29,-0.35]],0.027);
    },
    discs() {
      for(let row=0;row<2;row++) for(let c=0;c<(row?4:5);c++)
        add(cylinder,leather,(c-(row?1.5:2))*0.42,0.84+row*0.36,0.38,0.23,0.13,0.23,Math.PI/2);
      for(let row=0;row<2;row++)for(let c=0;c<(row?4:5);c++)
        add(cylinder,leather,(c-(row?1.5:2))*0.42,0.46,-0.31+row*0.39,0.23,0.13,0.23);
      legs(1.7,0.65,0.41);
      box(0,0.36,0,1.95,0.045,0.065);
      for(const x of [-0.65,0.65])box(x,0.79,0.45,0.035,0.86,0.035);
    },
    geometric() {
      legs(0.76,0.75,0.47);
      for(const x of [-0.4,0.4]) {
        box(x,0.63,0.15,0.055,0.58,0.055, lacquer);
        box(x,0.78,-0.06,0.14,0.055,0.96,lacquer);
      }
      box(0,0.4,-0.13,0.63,0.038,0.72,lacquer,0.13);
      box(0,0.98,0.31,0.62,1.13,0.035,lacquer,0.25);
      for(const z of [-0.4,0.32])box(0,0.24,z,0.97,0.055,0.055,lacquer);
    },
    nesting() {
      for(let i=0;i<4;i++) {
        const w=0.9-i*0.17,h=0.75-i*0.12,z=-i*0.14;
        box(0,h,z,w,0.035,0.55,lacquer);
        for(const x of [-w/2+0.025,w/2-0.025]) {
          for(const dz of [-0.25,0.25])box(x,h/2,z+dz,0.035,h,0.035,lacquer);
          box(x,0.035,z,0.035,0.035,0.52,lacquer);
        }
      }
    },
    ribbed() {
      for(let i=0;i<11;i++) {
        const t=i/10,z=-0.65+t*1.2,y=t<0.42?0.42+0.08*Math.sin(t*7):0.45+(t-0.42)*1.35;
        pad(0,y,z,0.72,0.10,0.15,t<0.42?0:-0.9);
      }
      for(const x of [-0.4,0.4]) tube(`ribbed-${x}`,[[x,0.39,-0.67],[x,0.46,-0.1],[x,1.26,0.61],[x,0.65,0.33],[x,0.06,0.5],[x,0.06,-0.64],[x,0.39,-0.67]]);
    },
    cantilever() {
      pad(0,0.49,-0.06,0.69,0.08,0.67);
      pad(0,0.88,0.29,0.69,0.7,0.085,0.1);
      for(const x of [-0.39,0.39])tube(`cantilever-${x}`,[[x,0.04,0.41],[x,0.04,-0.39],[x,0.16,-0.45],[x,0.65,-0.36],[x,0.85,0.28]],0.025);
    },
    tufted() {
      tuft(0.9,0.76,0.47,-0.08);
      pad(0,0.97,0.30,0.9,0.78,0.12,0.12);
      for(let i=0;i<5;i++)for(let j=0;j<4;j++)pad((i-2)*0.174,0.70+j*0.18,0.21+(j-1.5)*0.022,0.167,0.171,0.075,0.12);
      for(const x of [-0.39,0.39]) {
        tube(`tuft-a-${x}`,[[x,0.04,-0.48],[x,0.31,-0.18],[x,0.47,0.3],[x,1.18,0.4]],0.024);
        tube(`tuft-b-${x}`,[[x,0.04,0.48],[x,0.23,0.19],[x,0.46,-0.39]],0.024);
      }
    },
    daybed() {
      box(0,0.32,0,2.25,0.11,0.86,lacquer);
      legs(2,0.65,0.3);
      tuft(2.2,0.85,0.45,0,4,10);
      add(cylinder,leather,-0.84,0.66,0,0.14,0.85,0.14,Math.PI/2);
    },
    sling() {
      for(const x of [-0.46,0.46]) {
        tube(`sling-${x}`,[[x,0.05,0.43],[x,0.05,-0.46],[x,0.53,-0.46],[x,0.55,0.30],[x,1.01,0.35]],0.024);
        box(x,0.70,-0.02,0.16,0.035,0.79,leather,-0.18);
      }
      pad(0,0.42,-0.07,0.76,0.045,0.59);
      pad(0,0.89,0.30,0.87,0.20,0.045,0.1);
      pad(0,0.65,0.25,0.73,0.15,0.04,0.1);
      box(0,1.01,0.35,0.94,0.03,0.03);
      box(0,0.38,-0.4,0.94,0.03,0.03);
    }
  };
  const sequence=['bibendum','discs','geometric','ribbed','cantilever','tufted','sling','nesting','bibendum','tufted'];
  for(const piece of FURNITURE) {
    origin=piece;
    if(piece.kind==='lounge') models[sequence[piece.hallIndex]]();
    if(piece.kind==='bench') models.daybed();
  }
  const meshes=[];
  for(const {geometry,material,parts} of batches.values()) {
    const mesh=new T.InstancedMesh(geometry,material,parts.length);
    mesh.name='reference-furniture';
    parts.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    mesh.computeBoundingSphere();
    room.add(mesh);meshes.push(mesh);
  }
  return meshes;
}
