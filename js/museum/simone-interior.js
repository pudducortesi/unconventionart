import * as T from "../../vendor/three.module.js";

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
  const concrete=mat(0x646968,.95), steel=mat(0x24292b,.52,.42),
    chrome=mat(0xb5b9b5,.26,.82), leather=mat(0x493b31,.82);
  const lamp=new T.MeshBasicMaterial({color:0xf4e9d4,toneMapped:false});resources.push(lamp);
  const geo=new T.BoxGeometry(1,1,1); resources.push(geo);
  const add=(w,h,d,x,y,z,m=paper,ry=0)=>{const mesh=new T.Mesh(geo,m);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.rotation.y=ry;mesh.updateMatrix();root.add(mesh);return mesh};

  // The building already supplies walls, parquet and ceiling. A second shell
  // would close the doorway and cover the museum's actual floor finishes.

  // Four compact display blades. The structural walls remain in the navigation
  // model, but are rendered only here so no surfaces compete for the same pixels.
  const localDividers=[[-5,-7,3.6,0],[5,-5,3.6,0],[-5,6,3.6,0],[5,8,3.6,0]];
  for(const [x,z,w,r] of localDividers){
    add(w,3.6,.16,x,1.9,z,concrete,r);
    // The rails stand proud of the panel, with visible open steel corners.
    for(const side of [-1,1]){
      add(.055,3.75,.28,x+side*(w/2+.055),1.875,z,steel,r);
      add(w+.16,.055,.28,x,.13,z+side*.035,steel,r);
    }
    add(w+.16,.055,.28,x,3.75,z,steel,r);
    for(const side of [-1,1]) add(.08,.08,.08,x+side*(w/2-.24),.4,z+.13,chrome);
  }

  // Exposed steel ceiling members and warm linear lights: an industrial frame
  // around the existing room geometry, clear of the artwork hanging zone.
  for(const z of [-10.5,-3.5,3.5,10.5]){
    add(20.8,.19,.13,0,6.18,z,steel);
    add(14.2,.025,.045,0,6.045,z,lamp);
    for(const x of [-8.9,8.9]) add(.055,.25,.13,x,6.04,z,chrome);
  }

  // Low leather benches on precise tubular frames, informed by MVSEVM's
  // Bauhaus vocabulary without reproducing a catalogue model.
  for(const [x,z,r] of [[-2,0,0],[4,2,0]]){
    const group=new T.Group(); group.position.set(x,0,z);group.rotation.y=r;root.add(group);
    const seat=new T.Mesh(geo,leather);seat.scale.set(5.7,.2,1.27);seat.position.y=.47;group.add(seat);
    for(const sx of [-2.72,2.72]) for(const sz of [-.59,.59]){
      const leg=new T.Mesh(geo,chrome);leg.scale.set(.045,.45,.045);leg.position.set(sx,.22,sz);group.add(leg);
    }
    for(const sz of [-.59,.59]){
      const rail=new T.Mesh(geo,steel);rail.scale.set(5.5,.045,.045);rail.position.set(0,.29,sz);group.add(rail);
    }
  }

  // Entrance title is intentionally architectural, not a reproduction of Simone's drawings.
  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#f3f0e9';ctx.fillRect(0,0,1536,256);
  ctx.fillStyle='#202528';ctx.font='700 74px sans-serif';ctx.fillText('SIMONE PLOZZER',58,112);
  ctx.font='30px sans-serif';ctx.fillText('ILLUSTRAZIONE / 75 OPERE',61,177);
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;resources.push(tex);
  const signMat=new T.MeshBasicMaterial({map:tex,toneMapped:false});resources.push(signMat);
  const signGeo=new T.PlaneGeometry(6,1);resources.push(signGeo);
  const sign=new T.Mesh(signGeo,signMat);sign.position.set(-10.84,3.5,0);sign.rotation.y=-Math.PI/2;root.add(sign);

  root.visible=true;
  return {root, dispose(){scene.remove(root);resources.forEach(r=>r.dispose?.());}};
}
