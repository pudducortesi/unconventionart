import * as T from '../../vendor/three.module.js';
import { BRAND_CONTOURS } from './brand-contours.js';

export function createBrandRelief() {
  const path = new T.ShapePath();
  for (const points of BRAND_CONTOURS) {
    // Round only shallow turns along curves; keep the logo's true corners sharp.
    const vectors=points.map(([x,y])=>new T.Vector2((x-430)/43,(167.5-y)/43));
    const joins=vectors.map((p,i)=>{
      const before=vectors[(i+vectors.length-1)%vectors.length],after=vectors[(i+1)%vectors.length];
      const incoming=p.clone().sub(before).normalize(),outgoing=after.clone().sub(p).normalize();
      const round=incoming.dot(outgoing)>.65;
      return {p,start:round?p.clone().lerp(before,.42):p,end:round?p.clone().lerp(after,.42):p,round};
    });
    path.moveTo(joins[0].start.x,joins[0].start.y);
    for(const {p,start,end,round} of joins){
      path.lineTo(start.x,start.y);
      if(round)path.currentPath.quadraticCurveTo(p.x,p.y,end.x,end.y);
    }
    path.currentPath.closePath();
  }
  return new T.ExtrudeGeometry(path.toShapes(false), {
    depth:.09, bevelEnabled:true, bevelThickness:.004, bevelSize:.002,
    bevelSegments:3, steps:1, curveSegments:12,
  });
}

// One continuous contemporary foyer replaces the former reception/lounge wings.
export function furnishWelcomeHall({room,own,box}) {
  const plaster=own(new T.MeshStandardMaterial({color:0xd9d4c8,roughness:.88}));
  const limestone=own(new T.MeshStandardMaterial({color:0xc4bba9,roughness:.66}));
  const bronze=own(new T.MeshStandardMaterial({color:0x716954,metalness:.68,roughness:.48}));
  const oak=own(new T.MeshStandardMaterial({color:0x7c644b,roughness:.8}));
  const light=own(new T.MeshBasicMaterial({color:0xf4eddc}));
  const targets=[];
  // Mineral pores and directional strata are shared by desk and limestone.
  const size=256, pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const hash=((Math.imul(x+91,374761393)^Math.imul(y+71,668265263))>>>0)/4294967295;
    const strata=Math.sin(y*.18+Math.sin(x*.025)*1.8)*3;
    const v=224+strata+(hash-.5)*8-(hash>.989?19:0);
    pixels.set([v,v-5,v-13,255],(y*size+x)*4);
  }
  const mineral=own(new T.DataTexture(pixels,size,size));
  mineral.colorSpace=T.SRGBColorSpace;mineral.wrapS=mineral.wrapT=T.RepeatWrapping;
  mineral.generateMipmaps=true;mineral.minFilter=T.LinearMipmapLinearFilter;mineral.needsUpdate=true;
  limestone.map=mineral;limestone.bumpMap=mineral;limestone.bumpScale=.003;
  const fabric=own(new T.MeshStandardMaterial({color:0xd7d0c1,roughness:1}));
  const leather=own(new T.MeshStandardMaterial({color:0x60483d,roughness:.82}));
  const shadow=own(new T.MeshStandardMaterial({color:0x343630,roughness:.84}));
  // Rounded footprints match the navigation envelopes; bevelled solids replace
  // the former block furniture without increasing the occupied floor area.
  function rounded(w,d,h,r,x,y,z,material,name){
    const shape=new T.Shape(),a=-w/2,b=-d/2;
    shape.moveTo(a+r,b);shape.lineTo(a+w-r,b);shape.quadraticCurveTo(a+w,b,a+w,b+r);
    shape.lineTo(a+w,b+d-r);shape.quadraticCurveTo(a+w,b+d,a+w-r,b+d);
    shape.lineTo(a+r,b+d);shape.quadraticCurveTo(a,b+d,a,b+d-r);
    shape.lineTo(a,b+r);shape.quadraticCurveTo(a,b,a+r,b);
    const geometry=own(new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,curveSegments:8,steps:1}));
    const mesh=new T.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);
    mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;room.add(mesh);targets.push(mesh);return mesh;
  }

  // Large uninterrupted backdrop, with no rectangular sign or printed logo.
  box(53.5,10,.10,0,5,9.77,plaster);
  const brand = new T.Mesh(own(createBrandRelief()),plaster);
  brand.position.set(0,5.2,9.70);brand.rotation.y=Math.PI;
  brand.castShadow=true;brand.receiveShadow=true;
  brand.name='welcome-brand-relief';room.add(brand);targets.push(brand);
  box(54,.16,10.4,0,10.1,5,plaster);
  // Opaque infill closes the narrow slots above the retained gilded beams.
  for(const side of [-1,1]) box(.64,.40,10.4,side*4.70,9.87,5,plaster);
  // Recessed luminous ceiling slots and a grazing wall wash over the relief.
  for(const x of [-18,-9,0,9,18]){
    box(5.8,.06,1.7,x,9.99,4.6,bronze);
    box(5.6,.012,1.5,x,9.953,4.6,light);
  }
  box(23,.07,.12,0,9.93,8.9,bronze);
  box(22.8,.015,.07,0,9.887,8.9,light);
  for(const side of [-1,1]){
    // Oak acoustic fields anchor the seating and reception within one room.
    for(let n=0;n<38;n++)box(.07,4.7,.12,side*17+(n-18.5)*.18,2.7,9.65,oak);
    box(21.5,10,.14,side*16,5,.14,plaster);
  }
  box(10,.6,.22,0,9.75,.14,plaster);
  // Travertine reception, a rounded monolith with a recessed bronze foot.
  rounded(4.08,1.20,.10,.22,10,.025,5,bronze,'welcome-desk-plinth');
  rounded(4.35,1.43,.93,.28,10,.13,5,limestone,'welcome-travertine-desk');
  rounded(4.42,1.48,.055,.30,10,1.065,5,oak,'welcome-desk-oak-top');
  for(let n=0;n<31;n++)box(.015,.68,.012,8.35+n*.11,.62,4.274,bronze);
  // A single calm seating composition in warm boucle and saddle leather.
  rounded(3.15,1.12,.12,.2,-10,.07,6,shadow,'welcome-sofa-plinth');
  rounded(3.32,1.20,.27,.22,-10,.19,6,fabric,'welcome-sofa-base');
  for(const dx of [-.83,.83])rounded(1.58,.98,.15,.17,-10+dx,.46,5.94,fabric,'welcome-sofa-cushion');
  rounded(3.27,.28,.47,.12,-10,.46,6.44,fabric,'welcome-sofa-back');
  for(const dx of [-1.51,1.51])rounded(.27,1.16,.30,.10,-10+dx,.45,6,fabric,'welcome-sofa-arm');
  rounded(1.26,1.22,.12,.24,-13.2,.10,4.3,bronze,'welcome-chair-foot');
  rounded(1.48,1.43,.33,.28,-13.2,.22,4.3,leather,'welcome-chair-seat');
  rounded(1.45,.27,.49,.12,-13.2,.51,4.83,leather,'welcome-chair-back');
  for(const dx of [-.60,.60])rounded(.23,1.2,.31,.1,-13.2+dx,.48,4.3,leather,'welcome-chair-arm');
  rounded(.88,.88,.28,.35,-9.8,.02,3.8,bronze,'welcome-table-foot');
  rounded(1.35,1.35,.09,.50,-9.8,.30,3.8,limestone,'welcome-stone-table');
  const rugMaterial=own(new T.MeshStandardMaterial({color:0x9c9483,roughness:1}));
  const rug=rounded(7.7,5.1,.006,.65,-11,.013,5.0,rugMaterial,'welcome-woven-rug');
  rug.userData.walkable=true;
  // Thin suspended bronze rings establish human scale below the tall ceiling.
  const suspension=own(new T.CylinderGeometry(.006,.006,1,6));
  for(const [x,z,r,y] of [[10,5,2.0,4.4],[-11,5,2.3,4.65]]){
    for(const [tube,dy,material] of [[.035,0,bronze],[.016,-.036,light]]){
      const ring=new T.Mesh(own(new T.TorusGeometry(r,tube,8,72)),material);
      ring.rotation.x=Math.PI/2;ring.position.set(x,y+dy,z);ring.name='welcome-pendant-ring';room.add(ring);targets.push(ring);
    }
    for(let n=0;n<3;n++){
      const angle=n*Math.PI*2/3;
      const cable=new T.Mesh(suspension,bronze);cable.scale.y=9.92-y;
      cable.position.set(x+Math.cos(angle)*r,(9.92+y)/2,z+Math.sin(angle)*r);
      room.add(cable);targets.push(cable);
    }
  }
  // Fine bronze portal and inset floor bands lead back to the exhibition.
  for(const side of [-1,1]){
    box(.065,5.7,.18,side*5.16,2.85,.27,bronze);

    box(21.2,.055,.06,side*16,.06,9.68,bronze);
    box(.018,.018,9.4,side*26.6,9.89,4.9,light);
  }
  box(10.38,.065,.18,0,5.72,.27,bronze);
  return targets;
}
