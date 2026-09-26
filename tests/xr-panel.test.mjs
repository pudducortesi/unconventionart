import test from 'node:test';import assert from 'node:assert/strict';
import * as T from 'three';import {createXRPanel} from '../js/museum/xr-panel-runtime.js';
test('VR panel controller ray selects wave and exit and cleanup removes the panel',t=>{
 const previous=globalThis.document;t.after(()=>{globalThis.document=previous;});
 globalThis.document={createElement(){return {getContext(){return {clearRect(){},fillText(){},fillRect(){}};}};}};
 const parent=new T.Group(),renderer={localClippingEnabled:false,setTransparentSort(){}},calls=[];
 const panel=createXRPanel({parent,renderer,onWave:()=>calls.push('wave'),onExit:()=>calls.push('exit'),getStatus:()=> 'Test · 2 presenti'});
 for(const x of [-.18,.18]){const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(x,-.45,-1.038).normalize());assert.equal(panel.select(ray),true);}
 assert.deepEqual(calls,['wave','exit']);panel.update(.016);panel.dispose();panel.dispose();assert.equal(parent.children.length,0);assert.equal(renderer.localClippingEnabled,false);
});
