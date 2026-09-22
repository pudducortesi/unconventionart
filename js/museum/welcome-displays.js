import * as T from '../../vendor/three.module.js';
import { museumPlan } from './museum-plan.js';
export function welcomeDisplays({room,own,box,openHalls=new Set([0])}) {
  const rim=own(new T.MeshStandardMaterial({color:0x4a483f,metalness:.65,roughness:.45}));
  const make=(canvas,x,name,dialog)=>{
    const texture=own(new T.CanvasTexture(canvas));texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
    const width=14,height=7;
    box(width+.14,height+.14,.14,x,4.65,.25,rim);
    const mesh=new T.Mesh(own(new T.PlaneGeometry(width,height)),own(new T.MeshBasicMaterial({map:texture,toneMapped:false})));
    mesh.position.set(x,4.65,.34);mesh.name=name;mesh.userData.dialog=dialog;
    room.add(mesh);return mesh;
  };
  const map=document.createElement('canvas');map.width=2048;map.height=1024;
  const c=map.getContext('2d');c.fillStyle='#e8e3d7';c.fillRect(0,0,2048,1024);
  c.fillStyle='#292e29';c.font='48px sans-serif';c.fillText('IL MUSEO / 4 PIANI · 40 SALE',72,90);
  c.font='23px sans-serif';c.fillText('PIANTA GENERALE   ·   I PIANI SUPERIORI SONO IN PROGETTO',72,140);
  for(const level of museumPlan(openHalls)){
    const top=190+level.floor*174;c.fillStyle='#292e29';c.font='26px sans-serif';c.fillText(level.title.toUpperCase(),72,top+48);
    for(const [i,r] of level.rooms.entries()){
      const x=355+i*158;
      c.fillStyle=r.status==='Aperta'?'#344c40':r.status==='Chiusa'?'#ccc6b9':'#ded9ce';
      c.fillRect(x,top,142,104);c.fillStyle=r.status==='Aperta'?'#fff8e9':'#55594f';
      c.font='30px sans-serif';c.fillText(String(r.number).padStart(2,'0'),x+15,top+41);
      c.font='18px sans-serif';c.fillText(r.status,x+15,top+80);
    }
    c.fillStyle='#b7aa90';c.fillRect(355,top+117,1564,3);
  }
  c.fillStyle='#344c40';c.font='23px sans-serif';c.fillText('SEI QUI: HALL / PIANO TERRA',72,938);
  c.fillStyle='#676959';c.fillText('TOCCA LA MAPPA PER SCEGLIERE UNA SALA APERTA',800,938);
  const mapMesh=make(map,-16,'welcome-masterplan','floorplan');
  const poster=document.createElement('canvas');poster.width=1920;poster.height=960;
  const p=poster.getContext('2d');p.fillStyle='#111714';p.fillRect(0,0,1920,960);
  p.fillStyle='#b7a17a';p.font='26px sans-serif';p.fillText('UNCONVENTIONART / SALA DI BENVENUTO',110,145);
  p.fillStyle='#f0ebdf';p.font='78px sans-serif';p.fillText('Lo spazio.',110,360);p.fillText('Lo sguardo.',110,460);
  p.font='28px sans-serif';p.fillStyle='#c5c8bc';p.fillText('Fotografia · movimento · incontri',110,635);
  p.font='22px sans-serif';p.fillText('PRESENTAZIONE DEL MUSEO',110,800);
  const led=make(poster,16,'welcome-ledwall','welcome-film');
  return [mapMesh,led];
}
