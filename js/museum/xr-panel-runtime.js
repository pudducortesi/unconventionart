import * as T from 'three';
import {Container,reversePainterSortStable} from '@pmndrs/uikit';

export function createXRPanel({parent,renderer,onExit,onWave,getStatus}){
 const root=new T.Group();root.userData.xrIgnore=true;parent.add(root);
 root.position.set(0,-.38,-1.05);
 const backdrop=new Container({sizeX:.76,sizeY:.32,backgroundColor:0x202826,borderRadius:18,opacity:.97});root.add(backdrop);
 const previousClipping=renderer.localClippingEnabled;renderer.localClippingEnabled=true;renderer.setTransparentSort(reversePainterSortStable);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=384;
 const ctx=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const geometry=new T.PlaneGeometry(.74,.28),material=new T.MeshBasicMaterial({map:texture,transparent:true,depthTest:false});
 const label=new T.Mesh(geometry,material);label.position.z=.008;label.renderOrder=10000;root.add(label);
 const hitMaterial=new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
 const hitGeometry=new T.PlaneGeometry(.33,.12),buttons=[];
 for(const [x,action]of [[-.18,onWave],[.18,onExit]]){const hit=new T.Mesh(hitGeometry,hitMaterial);hit.position.set(x,-.07,.012);root.add(hit);buttons.push({hit,action});}
 let last='',disposed=false;
 function draw(){const status=getStatus?.()||'Visita individuale';if(status===last)return;last=status;
 ctx.clearRect(0,0,1024,384);ctx.fillStyle='#eee9df';ctx.font='bold 36px Arial';ctx.textAlign='center';ctx.fillText('UNCONVENTIONART',512,52);
 ctx.font='28px Arial';ctx.fillText(status.slice(0,54),512,115);
 ctx.fillStyle='#394d46';ctx.fillRect(20,188,475,145);ctx.fillStyle='#51443e';ctx.fillRect(529,188,475,145);
 ctx.fillStyle='#ffffff';ctx.font='bold 34px Arial';ctx.fillText('Saluta',258,275);ctx.fillText('Esci dalla VR',766,275);texture.needsUpdate=true;}
 draw();
 return {update(dt){if(disposed)return;backdrop.update(dt*1000);draw();},select(raycaster){root.updateMatrixWorld(true);const hit=raycaster.intersectObjects(buttons.map(b=>b.hit),false)[0];if(!hit)return false;buttons.find(b=>b.hit===hit.object).action();return true;},dispose(){if(disposed)return;disposed=true;root.removeFromParent();backdrop.dispose();geometry.dispose();material.dispose();texture.dispose();hitGeometry.dispose();hitMaterial.dispose();renderer.setTransparentSort(null);renderer.localClippingEnabled=previousClipping;}};
}
