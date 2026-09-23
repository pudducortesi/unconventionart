import {readFile,writeFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
// A metrically sized preview, not a statement about an edition offered for sale.
export async function buildARModel() {
 const photo=await sharp(await readFile('images/kavyar/01.jpg')).rotate().resize({width:1536,height:1536,fit:'inside',withoutEnlargement:true}).jpeg({quality:90}).toBuffer(), chunks=[], views=[], accessors=[]; let offset=0;
 function view(buffer,target){const pad=(4-buffer.length%4)%4;const i=views.length;views.push({buffer:0,byteOffset:offset,byteLength:buffer.length,...(target?{target}:{})});chunks.push(buffer,Buffer.alloc(pad));offset+=buffer.length+pad;return i;}
 function accessor(array,type,count,min,max){const bytes=Buffer.from(new Float32Array(array).buffer);const i=accessors.length;accessors.push({bufferView:view(bytes,34962),componentType:5126,count,type,...(min?{min,max}:{})});return i;}
 const width=.9*1365/2048,height=.9;
 const pos=[-width/2,-height/2,.016,width/2,-height/2,.016,width/2,height/2,.016,-width/2,-height/2,.016,width/2,height/2,.016,-width/2,height/2,.016];
 const p=accessor(pos,'VEC3',6,[-width/2,-height/2,.016],[width/2,height/2,.016]);
 const n=accessor(Array.from({length:6},()=>[0,0,1]).flat(),'VEC3',6);
 const uv=accessor([0,1,1,1,1,0,0,1,1,0,0,0],'VEC2',6);
 // Thin, full box behind the print gives a visible frame and back in AR.
 const x=width/2+.015,y=height/2+.015,z=.015, vertices=[], normals=[];
 const faces=[[[1,0,0],[[x,-y,-z],[x,y,-z],[x,y,z],[x,-y,z]]],[[-1,0,0],[[-x,-y,z],[-x,y,z],[-x,y,-z],[-x,-y,-z]]],[[0,1,0],[[-x,y,z],[x,y,z],[x,y,-z],[-x,y,-z]]],[[0,-1,0],[[-x,-y,-z],[x,-y,-z],[x,-y,z],[-x,-y,z]]],[[0,0,1],[[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]]],[[0,0,-1],[[x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z]]]];
 for(const [normal,corners] of faces)for(const i of [0,1,2,0,2,3]){vertices.push(...corners[i]);normals.push(...normal);}
 const fp=accessor(vertices,'VEC3',36,[-x,-y,-z],[x,y,z]),fn=accessor(normals,'VEC3',36),photoView=view(photo);
 const gltf={asset:{version:'2.0',generator:'UnconventionArt print preview'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:p,NORMAL:n,TEXCOORD_0:uv},material:0},{attributes:{POSITION:fp,NORMAL:fn},material:1}]}],materials:[{pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:0,roughnessFactor:1},extensions:{KHR_materials_unlit:{}}},{pbrMetallicRoughness:{baseColorFactor:[.035,.035,.035,1],metallicFactor:0,roughnessFactor:.7}}],extensionsUsed:['KHR_materials_unlit'],textures:[{source:0,sampler:0}],samplers:[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}],images:[{bufferView:photoView,mimeType:'image/jpeg'}],accessors,bufferViews:views,buffers:[{byteLength:offset}]};
 let json=Buffer.from(JSON.stringify(gltf));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const bin=Buffer.concat(chunks);const header=Buffer.alloc(12);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+json.length+8+bin.length,8);const jh=Buffer.alloc(8);jh.writeUInt32LE(json.length);jh.writeUInt32LE(0x4e4f534a,4);const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
 await mkdir('models',{recursive:true});await writeFile('models/kavyar-01.glb',Buffer.concat([header,jh,json,bh,bin]));
}
