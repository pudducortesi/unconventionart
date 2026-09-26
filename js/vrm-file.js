export function validateVRMBuffer(buffer){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<20||buffer.byteLength>25*1024*1024)throw Error('Usa un file VRM fino a 25 MB.');
 const view=new DataView(buffer);
 if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==buffer.byteLength||view.getUint32(16,true)!==0x4e4f534a)throw Error('Il file non è un VRM/GLB valido.');
 const length=view.getUint32(12,true);if(length>buffer.byteLength-20)throw Error('File incompleto.');
 const data=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length)));
 if(!data.extensions?.VRM&&!data.extensions?.VRMC_vrm)throw Error('Questo modello non contiene un avatar VRM.');
 // No untrusted URLs or custom decoder requests; this preview stays local.
 for(const part of [...(data.buffers||[]),...(data.images||[])])if(part.uri)throw Error('Usa un VRM con tutte le risorse incorporate nel file.');
 if((data.nodes?.length||0)>1000||(data.meshes?.length||0)>128)throw Error('Il modello è troppo complesso per questa anteprima.');
 return data;
}
