import * as T from "../../vendor/three.module.js";
import { SIMONE_ROOM } from "./simone-room.js";

/**
 * Interior-design prototype for the Simone Plozzer artist room.
 * The supplied illustrations informed only palette, rhythm and material language.
 * No supplied artwork is embedded, copied or used as a texture.
 */
export function createSimoneInterior(scene) {
  const root=new T.Group(); root.name='simone-plozzer-interior';
  // Uses the existing Sala 08 envelope and its corridor doorway at x=5, z=-91.
  root.position.set(16,0,-91);
  scene.add(root);
  const resources=[];
  const mat=(color,roughness=.9,metalness=0)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});resources.push(m);return m};
  const paper=mat(SIMONE_ROOM.palette.paper,.96), ink=mat(SIMONE_ROOM.palette.ink,.88),
    graphite=mat(SIMONE_ROOM.palette.graphite,.93), metal=mat(0x17191c,.52,.38);
  const cyan=new T.MeshBasicMaterial({color:SIMONE_ROOM.palette.cyan,transparent:true,opacity:.34,toneMapped:false});resources.push(cyan);
  const geo=new T.BoxGeometry(1,1,1); resources.push(geo);
  const add=(w,h,d,x,y,z,m=paper,ry=0)=>{const mesh=new T.Mesh(geo,m);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.rotation.y=ry;mesh.updateMatrix();root.add(mesh);return mesh};

  const depth=26;
  // The building already supplies walls, parquet and ceiling. A second shell
  // would close the doorway and cover the museum's actual floor finishes.

  // ALIVAR-informed modular divider proportions, deliberately irregular like hand-drawn ink strokes.
  const localDividers=[[-5,-7,3.6,0],[5,-5,3.6,0],[-5,6,3.6,0],[5,8,3.6,0]];
  for(const [x,z,w,r] of localDividers){ add(w,3.7,.16,x,1.85,z,ink,r); add(w+.06,.035,.22,x,.12,z,metal,r); }

  // Sparse cyan cuts: colour is atmosphere, never a decorative wash.
  for(const [x,z,len] of [[10,-10,1.5],[10,0,1.5],[10,10,1.5]]){
    const strip=add(.045,3.8,len,x,2.25,z,cyan,0);
    strip.name='simone-cyan-light-cut';
  }

  // Minimal sketch furniture: three low islands, black line-work with paper cushions.
  for(const [x,z,r] of [[-2,0,.03],[4,2,-.025]]){
    const group=new T.Group(); group.position.set(x,0,z);group.rotation.y=r;root.add(group);
    const base=new T.Mesh(geo,metal);base.scale.set(6,.16,1.55);base.position.y=.22;group.add(base);
    const seat=new T.Mesh(geo,paper);seat.scale.set(5.65,.24,1.3);seat.position.y=.42;group.add(seat);
    for(const sx of [-2.7,2.7]){const leg=new T.Mesh(geo,ink);leg.scale.set(.08,.42,1.42);leg.position.set(sx,.2,0);group.add(leg)}
  }

  // Entrance title is intentionally architectural, not a reproduction of Simone's drawings.
  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#f3f0e9';ctx.fillRect(0,0,1536,256);
  ctx.fillStyle='#111214';ctx.font='700 74px sans-serif';ctx.fillText('SIMONE PLOZZER',58,112);
  ctx.font='30px sans-serif';ctx.fillText('ILLUSTRAZIONE / 75 OPERE',61,177);
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;resources.push(tex);
  const signMat=new T.MeshBasicMaterial({map:tex,toneMapped:false});resources.push(signMat);
  const signGeo=new T.PlaneGeometry(6,1);resources.push(signGeo);
  const sign=new T.Mesh(signGeo,signMat);sign.position.set(-10.84,3.5,0);sign.rotation.y=-Math.PI/2;root.add(sign);

  root.visible=true;
  return {root, dispose(){scene.remove(root);resources.forEach(r=>r.dispose?.());}};
}
