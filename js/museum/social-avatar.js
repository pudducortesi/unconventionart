import * as T from '../../vendor/three.module.js';
import {normalizeAvatar} from './social-model.js';
export function createAvatar(value,name='') {
  const a=normalizeAvatar(value),root=new T.Group(),width={slim:.88,regular:1,broad:1.17}[a.build];
  const mats={skin:new T.MeshStandardMaterial({color:a.skin,roughness:.8}),hair:new T.MeshStandardMaterial({color:a.hair,roughness:.9}),outfit:new T.MeshStandardMaterial({color:a.outfit,roughness:.85}),trousers:new T.MeshStandardMaterial({color:'#292c33',roughness:.9}),eyes:new T.MeshStandardMaterial({color:'#201b1b'}),shoe:new T.MeshStandardMaterial({color:'#17191d'})};
  function part(geometry,material,x,y,z,sx=1,sy=1,sz=1){const mesh=new T.Mesh(geometry,mats[material]);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);root.add(mesh);return mesh;}
  const sphere=()=>new T.SphereGeometry(1,12,8);
  part(sphere(),'skin',0,1.53,0,.16,.21,.15);
  part(new T.CylinderGeometry(.16,.21,.51,10),'outfit',0,1.05,0,width,1,.66);
  part(new T.CylinderGeometry(.07,.075,.13,10),'skin',0,1.34,0);
  const limbs=[];
  for(const side of [-1,1]){
    const arm=part(new T.CapsuleGeometry(.065,.35,3,8),'outfit',side*.25*width,1.04,0);arm.rotation.z=side*.12;limbs.push(arm);
    part(sphere(),'skin',side*.28*width,.77,0,.058,.075,.055);
    const leg=part(new T.CapsuleGeometry(.085,.50,3,8),'trousers',side*.105,.43,0);limbs.push(leg);
    part(sphere(),'shoe',side*.105,.09,-.045,.093,.085,.17);
    part(sphere(),'eyes',side*.06,1.55,-.136,.019,.021,.012);
  }
  if(a.style!=='shaved'){
    part(new T.SphereGeometry(1,12,8,0,Math.PI*2,0,Math.PI*.52),'hair',0,1.57,0,.173,.20,.161);
    if(a.style==='bob'||a.style==='long')part(new T.CylinderGeometry(.16,.19,a.style==='long'?.40:.18,12,1,true,0,Math.PI*1.45),'hair',0,a.style==='long'?1.40:1.50,.025,1,1,.95);
  }
  if(name){const canvas=document.createElement('canvas');canvas.width=384;canvas.height=72;const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(20,24,32,.86)';ctx.beginPath();ctx.roundRect(0,0,384,72,24);ctx.fill();ctx.font='500 30px sans-serif';ctx.fillStyle='white';ctx.textAlign='center';ctx.fillText(name.slice(0,32),192,47,355);const texture=new T.CanvasTexture(canvas);const label=new T.Sprite(new T.SpriteMaterial({map:texture,depthWrite:false}));label.position.y=1.96;label.scale.set(1.1,.21,1);root.add(label);}
  root.userData.limbs=limbs;
  root.userData.dispose=()=>{root.traverse(o=>{o.geometry?.dispose();if(o.material){o.material.map?.dispose();}});for(const m of Object.values(mats))m.dispose();root.traverse(o=>{if(o.isSprite)o.material.dispose();});};
  return root;
}
export function createAvatarLayer(scene,wake){
  const peers=new Map();
  return {
    sync(participants,self){
      const ids=new Set();
      for(const p of participants){if(p.id===self)continue;ids.add(p.id);let peer=peers.get(p.id);const signature=JSON.stringify([p.name,p.avatar]);
        if(peer?.signature!==signature){if(peer){scene.remove(peer.mesh);peer.mesh.userData.dispose();}const mesh=createAvatar(p.avatar,p.name);mesh.position.set(p.x,p.y,p.z);mesh.rotation.y=p.yaw;scene.add(mesh);peer={mesh,signature};peers.set(p.id,peer);}
        peer.target=new T.Vector3(p.x,p.y,p.z);peer.yaw=p.yaw;
      }
      for(const [id,p] of peers)if(!ids.has(id)){scene.remove(p.mesh);p.mesh.userData.dispose();peers.delete(id);}wake();
    },
    update(dt,time){let moving=false;for(const p of peers.values()){
      const distance=p.mesh.position.distanceTo(p.target),angle=Math.atan2(Math.sin(p.yaw-p.mesh.rotation.y),Math.cos(p.yaw-p.mesh.rotation.y));
      if(distance>.01||Math.abs(angle)>.01){moving=true;p.mesh.position.lerp(p.target,1-Math.exp(-dt*9));p.mesh.rotation.y+=angle*(1-Math.exp(-dt*10));}
      p.mesh.userData.limbs.forEach((limb,i)=>{limb.rotation.x=distance>.025?Math.sin(time*.009+i*Math.PI)*.25:0;});
    }return moving;},
    clear(){for(const p of peers.values()){scene.remove(p.mesh);p.mesh.userData.dispose();}peers.clear();wake();},
  };
}
