import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
export async function fixture(){
  const b=await readFile('avatars/atelier-v1.glb'),len=b.readUInt32LE(12),json=JSON.parse(b.subarray(20,20+len));
  const binary=b.subarray(28+len);json.buffers=[{byteLength:binary.length,uri:'data:application/octet-stream;base64,'+binary.toString('base64')}];
  // Node has no image decoder: omit maps for structural/skin validation only.
  json.materials=json.materials.map(m=>({name:m.name,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1]}}));delete json.images;delete json.textures;delete json.extensionsUsed;delete json.extensionsRequired;
  globalThis.ProgressEvent ||= class{constructor(type,init){Object.assign(this,init);this.type=type;}};
  return new GLTFLoader().parseAsync(JSON.stringify(json),'');
}
