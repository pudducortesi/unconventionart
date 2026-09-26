import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {mkdir,stat} from 'node:fs/promises';
import {dirname} from 'node:path';
export async function optimizeAvatar(input,output){
 await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
 const document=await io.read(input);
 const root=document.getRoot();
 const before={nodes:root.listNodes().length,skins:root.listSkins().length,animations:root.listAnimations().length};
 // Preserve the authored rig and vertex precision: no simplification or quantization.
 await document.transform(dedup({propertyTypes:['Material','Texture']}));
 document.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
 await mkdir(dirname(output),{recursive:true});await io.write(output,document);
 const checked=(await io.read(output)).getRoot();
 if(checked.listNodes().length!==before.nodes||checked.listSkins().length!==before.skins||checked.listAnimations().length!==before.animations)throw Error('Avatar rig changed during optimization');
 return {inputBytes:(await stat(input)).size,outputBytes:(await stat(output)).size,...before};
}
