import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {VRMLoaderPlugin,VRMUtils} from '@pixiv/three-vrm';
import {MeshoptDecoder} from 'meshoptimizer';
export async function createVRMPreview(container,buffer){
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(p=>new VRMLoaderPlugin(p)).parseAsync(buffer,'');
 const vrm=gltf.userData.vrm;if(!vrm){VRMUtils.deepDispose(gltf.scene);throw Error('Avatar VRM non valido.');}
 let renderer;try{renderer=new T.WebGLRenderer({alpha:true,antialias:true});}catch(e){VRMUtils.deepDispose(vrm.scene);throw Error('Anteprima 3D non disponibile in questo browser.');}
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.05,30),group=new T.Group();scene.add(group);group.add(vrm.scene);VRMUtils.rotateVRM0(vrm);
 const bounds=new T.Box3().setFromObject(vrm.scene),height=bounds.max.y-bounds.min.y;if(!Number.isFinite(height)||height<.1){renderer.dispose();VRMUtils.deepDispose(vrm.scene);throw Error('Dimensioni del modello non valide.');}
 group.scale.setScalar(1.7/height);vrm.scene.position.y-=bounds.min.y;camera.position.set(0,.95,3.5);camera.lookAt(0,.9,0);
 scene.add(new T.HemisphereLight(0xffffff,0x737d72,2.5));const light=new T.DirectionalLight(0xffffff,2);light.position.set(2,4,3);scene.add(light);
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));container.replaceChildren(renderer.domElement);
 const resize=()=>{renderer.setSize(container.clientWidth,container.clientHeight);camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(container);resize();
 let last=0,frame=0,disposed=false,pointer=null;const canvas=renderer.domElement;
 canvas.onpointerdown=e=>{pointer=e.clientX;canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(pointer!==null){group.rotation.y+=(e.clientX-pointer)*.01;pointer=e.clientX;}};canvas.onpointerup=canvas.onpointercancel=()=>{pointer=null;};
 function render(time){if(disposed)return;const delta=Math.min(.05,(time-last)/1000);last=time;vrm.update(delta);renderer.render(scene,camera);frame=requestAnimationFrame(render);}frame=requestAnimationFrame(render);
 return {dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer.disconnect();VRMUtils.deepDispose(vrm.scene);renderer.dispose();canvas.remove();}};
}
