import * as T from '../../vendor/three.module.js';

// Polished warm stone, cream bands and inset brown squares. This replaces only
// the promenade surface; gallery rooms continue to use the parquet maps.
export function createStoneFloor(own, anisotropy) {
  const size=512, pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const u=x/size,v=y/size, edge=Math.min(u,v,1-u,1-v);
    const border=edge<.095, fine=edge>.12&&edge<.135;
    const vein=Math.sin(x*.028+Math.sin(y*.017)*3)*2+Math.sin(x*.11+y*.05)*.8;
    const base=border?[208,197,174]:fine?[113,91,67]:[152,132,104];
    const i=(y*size+x)*4;
    for(let c=0;c<3;c++) pixels[i+c]=base[c]+vein;
    pixels[i+3]=255;
  }
  const map=own(new T.DataTexture(pixels,size,size,T.RGBAFormat));
  map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;
  map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;
  map.generateMipmaps=true;map.anisotropy=anisotropy;map.needsUpdate=true;
  return own(new T.MeshPhysicalMaterial({map,color:0xffffff,roughness:.22,metalness:0,
    clearcoat:.65,clearcoatRoughness:.16}));
}
