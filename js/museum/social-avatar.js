import * as T from '../../vendor/three.module.js';
import {normalizeAvatar} from './social-model.js';
import {attachGlasses} from './avatar-glasses.js';

// Locally generated, articulated fallback. No remote model/texture requests.
function createFallback(value,name='') {
  const a=normalizeAvatar(value),root=new T.Group(),body=new T.Group();root.add(body);
  const width={slim:.89,regular:1,broad:1.13}[a.build];
  const material=(color,roughness=.8)=>new T.MeshStandardMaterial({color,roughness});
  const mats={skin:material(a.skin),hair:material(a.hair,.7),outfit:material(a.outfit),trousers:material('#292c33'),eyes:material('#f4f0e8',.3),iris:material('#423729',.3),pupil:material('#131313',.2),shoe:material('#17191d',.6),sole:material('#b7b1a8'),lip:material(new T.Color(a.skin).multiplyScalar(.62)),trim:material(new T.Color(a.outfit).multiplyScalar(.65))};
  const sphere=new T.SphereGeometry(1,16,12),geometries=new Set([sphere]);
  function mesh(parent,geometry,mat,x,y,z,sx=1,sy=1,sz=1){geometries.add(geometry);const m=new T.Mesh(geometry,mats[mat]);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
  const oval=(parent,mat,x,y,z,sx,sy,sz)=>mesh(parent,sphere,mat,x,y,z,sx,sy,sz);
  function joint(parent,name,x,y,z){const j=new T.Group();j.name=name;j.position.set(x,y,z);parent.add(j);return j;}
  function taper(parent,mat,length,top,bottom,x=0,y=0,z=0,depth=1){return mesh(parent,new T.CylinderGeometry(top,bottom,length,12),mat,x,y,z,1,1,depth);}
  // Shaped torso: waist, ribs and shoulders, instead of an inverted cone.
  const points=[[0,.86],[.14,.87],[.16,.94],[.155,1.03],[.19,1.20],[.215,1.27],[.17,1.31],[.075,1.34],[0,1.34]].map(([r,y])=>new T.Vector2(r,y));
  mesh(body,new T.LatheGeometry(points,20),'outfit',0,0,0,width,1,.64);
  oval(body,'trousers',0,.87,0,.17*width,.115,.105);
  taper(body,'trim',.025,.154*width,.157*width,0,.94,0,.66);
  taper(body,'skin',.14,.055,.065,0,1.35,0,.9);
  const head=joint(body,'head',0,1.50,0);
  oval(head,'skin',0,.015,0,.133,.185,.125);
  oval(head,'skin',0,-.073,-.017,.103,.105,.108);
  oval(head,'skin',0,-.005,-.126,.023,.040,.029); // nose
  oval(head,'lip',0,-.075,-.111,.039,.009,.011);
  oval(head,'skin',0,-.112,-.073,.055,.032,.034);
  const lids=[];
  for(const side of [-1,1]){
    oval(head,'skin',side*.131,.005,.002,.026,.043,.022);
    oval(head,'lip',side*.143,.005,-.003,.009,.024,.010);
    const eye=joint(head,'eye',side*.050,.041,-.111);lids.push(eye);
    oval(eye,'eyes',0,0,0,.029,.019,.013);
    oval(eye,'iris',0,0,-.012,.012,.014,.004);
    oval(eye,'pupil',0,0,-.016,.0055,.009,.002);
    oval(eye,'eyes',-.003,.005,-.018,.003,.004,.001);
    const brow=oval(head,'hair',side*.052,.077,-.108,.033,.006,.010);brow.rotation.z=side*.10;
  }
  if(a.style==='shaved'){
    mesh(head,new T.SphereGeometry(1,20,12,0,Math.PI*2,0,1.28),'hair',0,.025,.003,.135,.184,.127);
  }else{
    mesh(head,new T.SphereGeometry(1,20,12,0,Math.PI*2,0,1.55),'hair',0,.042,.011,.146,.171,.140);
    for(let i=0;i<5;i++){const lock=oval(head,'hair',-.10+i*.043,.138,-.081,.045,.052,.058);lock.rotation.z=-.25;}
    if(a.style==='bob'||a.style==='long'){
      const length=a.style==='long'?.30:.16;
      for(let i=0;i<9;i++){const angle=-Math.PI*.10+i*Math.PI*1.20/8;
        const x=Math.cos(angle)*.134,z=Math.sin(angle)*.112;
        oval(head,'hair',x,.025-length*.38,z,.043,length,.043);
      }
    }
  }
  const frameColor={black:'#242329',tortoise:'#714b30',gold:'#a58143'}[a.frame];
  const disposeGlasses=attachGlasses(T,head,a.glasses,{y:.041,z:-.158,eyes:.05,radius:.039,color:frameColor});
  const arms=[],legs=[],elbows=[],knees=[];
  for(const side of [-1,1]){
    const arm=joint(body,side<0?'leftUpperArm':'rightUpperArm',side*.208*width,1.265,0);arm.rotation.z=side*.075;arms.push(arm);
    oval(arm,'outfit',side*.012,-.047,0,.069,.09,.070);
    taper(arm,'outfit',.205,.060,.046,side*.015,-.145,0);
    const elbow=joint(arm,'elbow',side*.015,-.255,0);elbows.push(elbow);
    oval(elbow,'outfit',0,0,0,.047,.048,.047);
    taper(elbow,'outfit',.19,.044,.033,0,-.10,0);
    taper(elbow,'trim',.028,.034,.034,0,-.198,0);
    oval(elbow,'skin',0,-.245,-.007,.036,.055,.023);
    oval(elbow,'skin',-side*.028,-.231,-.011,.015,.030,.014);
    const leg=joint(body,side<0?'leftUpperLeg':'rightUpperLeg',side*.089,.87,0);legs.push(leg);
    taper(leg,'trousers',.35,.088,.059,0,-.175,0,.92);
    const knee=joint(leg,'knee',0,-.36,0);knees.push(knee);
    oval(knee,'trousers',0,0,0,.061,.058,.056);
    taper(knee,'trousers',.38,.059,.043,0,-.185,0,.95);
    oval(knee,'shoe',0,-.408,-.035,.062,.055,.118);
    oval(knee,'sole',0,-.44,-.039,.064,.019,.122);
  }
  if(name){const canvas=document.createElement('canvas');canvas.width=384;canvas.height=72;const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(20,24,32,.86)';ctx.beginPath();ctx.roundRect(0,0,384,72,24);ctx.fill();ctx.font='500 30px sans-serif';ctx.fillStyle='white';ctx.textAlign='center';ctx.fillText(name.slice(0,32),192,47,355);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const label=new T.Sprite(new T.SpriteMaterial({map:texture,depthWrite:false}));label.position.y=1.96;label.scale.set(1.1,.21,1);root.add(label);}
  let stride=0,disposed=false;
  root.userData.limbs=[...arms,...legs];
  // Return true only while the gait needs frames to reach its resting pose.
  root.userData.animate=(dt,time,speed=0,waving=false)=>{
    if(disposed)return false;
    const t=(Number.isFinite(time)?time:0)/1000,delta=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
    stride+=(T.MathUtils.clamp(speed,0,1)-stride)*(1-Math.exp(-delta*12));
    if(speed<=0&&stride<.001)stride=0;
    body.position.y=Math.abs(Math.sin(t*7))*stride*.012;
    head.rotation.y=Math.sin(t*.7)*.025*(1-stride);
    const blink=t%4.7,open=blink<.15?Math.max(.08,Math.abs(blink-.075)/.075):1;
    lids.forEach(e=>e.scale.y=open);
    for(let i=0;i<2;i++){const phase=t*7+i*Math.PI,wave=Math.sin(phase)*stride;
      legs[i].rotation.x=wave*.38;knees[i].rotation.x=-Math.max(0,-wave)*.52;
      arms[i].rotation.x=-wave*.28;elbows[i].rotation.x=-.10-Math.max(0,wave)*.20;
    }
    arms[1].rotation.z=waving?2.3+.12*Math.sin(t*10):.075;
    elbows[1].rotation.z=waving?-.5+.18*Math.sin(t*10):0;
    return stride>0||waving;
  };
  root.userData.dispose=()=>{if(disposed)return;disposed=true;disposeGlasses();for(const g of geometries)g.dispose();for(const m of Object.values(mats))m.dispose();root.traverse(o=>{if(o.isSprite){o.material.map?.dispose();o.material.dispose();}});};
  return root;
}
export function createAvatarLayer(scene,wake){
  const peers=new Map();
  return {
    sync(participants,self){
      const ids=new Set();
      for(const p of participants){if(p.id===self)continue;ids.add(p.id);let peer=peers.get(p.id);const signature=JSON.stringify([p.name,p.avatar]);
        if(peer?.signature!==signature){if(peer){scene.remove(peer.mesh);peer.mesh.userData.dispose();}const mesh=createAvatar(p.avatar,p.name,wake);mesh.position.set(p.x,p.y,p.z);mesh.rotation.y=p.yaw;scene.add(mesh);peer={mesh,signature};peers.set(p.id,peer);}
        peer.target=new T.Vector3(p.x,p.y,p.z);peer.yaw=p.yaw;peer.wave=p.wave===true;
      }
      for(const [id,p] of peers)if(!ids.has(id)){scene.remove(p.mesh);p.mesh.userData.dispose();peers.delete(id);}wake();
    },
    update(dt,time){let moving=false;for(const p of peers.values()){
      const distance=p.mesh.position.distanceTo(p.target),angle=Math.atan2(Math.sin(p.yaw-p.mesh.rotation.y),Math.cos(p.yaw-p.mesh.rotation.y));
      const walking=distance>.01,turning=Math.abs(angle)>.01;
      if(walking)p.mesh.position.lerp(p.target,1-Math.exp(-dt*9));else p.mesh.position.copy(p.target);
      if(turning)p.mesh.rotation.y+=angle*(1-Math.exp(-dt*10));else p.mesh.rotation.y=p.yaw;
      const settling=p.mesh.userData.animate(dt,time,walking?Math.min(1,distance*8):0,p.wave);
      moving=walking||turning||settling||moving;
    }return moving;},
    clear(){for(const p of peers.values()){scene.remove(p.mesh);p.mesh.userData.dispose();}peers.clear();wake();},
  };
}

// Synchronous placeholder preserves room responsiveness; the model is fetched once, on demand.
export function createAvatar(value,name='',onReady=()=>{}){
  const a=normalizeAvatar(value),root=createFallback(a,name);
  if(a.model!=='atelier')return root;
  const fallbackBody=root.children[0],fallbackAnimate=root.userData.animate,disposeFallback=root.userData.dispose;
  let loaded=null,disposed=false;
  root.userData.status='loading';
  root.userData.animate=(...args)=>(loaded?loaded.userData.animate:fallbackAnimate)(...args);
  root.userData.ready=import('../../vendor/avatar-runtime.js').then(runtime=>runtime.loadAtelier(a)).then(model=>{
    if(disposed){model.userData.dispose();return;}
    loaded=model;fallbackBody.visible=false;root.add(model);root.userData.status='ready';onReady(root);
  }).catch(()=>{if(!disposed){root.userData.status='fallback';onReady(root);}});
  root.userData.dispose=()=>{if(disposed)return;disposed=true;if(loaded){root.remove(loaded);loaded.userData.dispose();}disposeFallback();};
  return root;
}
