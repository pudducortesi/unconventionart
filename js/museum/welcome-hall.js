import * as T from '../../vendor/three.module.js';
import { BRAND_CONTOURS } from './brand-contours.js';

export function createBrandRelief() {
  const path = new T.ShapePath();
  for (const points of BRAND_CONTOURS) {
    points.forEach(([x,y],i) => path[i ? 'lineTo' : 'moveTo']((x-430)/86,(167.5-y)/86));
    path.currentPath.closePath();
  }
  return new T.ExtrudeGeometry(path.toShapes(false), {
    depth:.09, bevelEnabled:true, bevelThickness:.006, bevelSize:.005,
    bevelSegments:1, steps:1, curveSegments:1,
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
  // Large uninterrupted backdrop, with no rectangular sign or printed logo.
  box(53.5,6,.10,0,3,9.77,plaster);
  const brand = new T.Mesh(own(createBrandRelief()),plaster);
  brand.position.set(0,3.4,9.70);brand.rotation.y=Math.PI;
  brand.castShadow=true;brand.receiveShadow=true;
  brand.name='welcome-brand-relief';room.add(brand);targets.push(brand);
  box(53.5,.16,9.7,0,6.1,4.9,plaster);
  // Floor is continuous across the old two wings and remains tap-to-walk.
  const floor=new T.Mesh(own(new T.PlaneGeometry(53.5,9.85)),limestone);
  floor.rotation.x=-Math.PI/2;floor.position.set(0,.005,4.95);
  floor.name='welcome-limestone-floor';floor.userData.walkable=true;floor.receiveShadow=true;
  room.add(floor);targets.push(floor);
  for(const x of [-21,-14,-7,7,14,21])box(.012,.002,9.7,x,.008,4.95,bronze);
  // Recessed luminous ceiling slots and a grazing wall wash over the relief.
  for(const x of [-18,-9,0,9,18]){
    box(5.8,.06,1.7,x,5.99,4.6,bronze);
    box(5.6,.012,1.5,x,5.953,4.6,light);
  }
  box(13,.07,.12,0,5.93,8.9,bronze);
  box(12.8,.015,.07,0,5.887,8.9,light);
  for(const side of [-1,1]){
    // Oak acoustic fields anchor the seating and reception within one room.
    for(let n=0;n<38;n++)box(.07,4.7,.12,side*17+(n-18.5)*.18,2.7,9.65,oak);
    box(21.5,6,.14,side*16,3,.14,plaster);
  }
  box(10,.6,.22,0,5.75,.14,plaster);
  // Monolithic welcome desk with inset plinth, matching collision footprint.
  box(4.1,.12,1.25,10,.06,5,bronze);
  box(4.4,.96,1.5,10,.60,5,limestone);
  box(4.48,.05,1.55,10,1.105,5,oak);
  box(3.95,.015,.02,10,.16,4.24,light);
  return targets;
}
