import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

export function psnr(reference, decoded) {
  if (reference.length !== decoded.length) throw Error('Image dimensions differ');
  let error=0;for(let i=0;i<reference.length;i++)error+=(reference[i]-decoded[i])**2;
  return error ? 10*Math.log10(65025/(error/reference.length)) : Infinity;
}
// PSNR is a numerical guard, not a perceptual-quality guarantee. Masters are never overwritten.
export async function optimizePhotos(catalogue, { root='.', output='dist', minimumPSNR=42 }={}) {
  const result=structuredClone(catalogue), report=[];
  await mkdir(join(output,'images/optimized'),{recursive:true});
  for(const work of result.works) {
    if(!/^images\/(?!private\/)[\w./-]+$/.test(work.image) || work.image.split('/').includes('..')) throw Error(`Unsupported public photo path: ${work.image}`);
    const input=await readFile(join(root,work.image));
    const hash=createHash('sha256').update(input).digest('hex');
    const metadata=await sharp(input).metadata();
    if((metadata.pages || 1)>1)continue;
    const entry={id:work.id,original:work.image,originalBytes:input.length,sourceSha256:hash,variants:[]};
    for(const [field,edge] of [['thumbnail',768],['mobilePreview',1024],['preview',1536]]) {
      const pipeline=sharp(input).rotate().toColourspace('srgb').resize({width:edge,height:edge,fit:'inside',withoutEnlargement:true});
      const {data:reference,info}=await pipeline.clone().removeAlpha().raw().toBuffer({resolveWithObject:true});
      let buffer,score,quality;
      for(const candidate of [90,95,'lossless']) {
        quality=candidate;
        buffer=await pipeline.clone().webp(candidate==='lossless'?{lossless:true,effort:6}:{quality:candidate,effort:6}).toBuffer();
        const decoded=await sharp(buffer).removeAlpha().raw().toBuffer();score=psnr(reference,decoded);
        if(score>=minimumPSNR)break;
      }
      // Don't replace a smaller original with a larger derivative.
      const accepted=buffer.length<input.length;
      const path=`images/optimized/${createHash('sha256').update(buffer).digest('hex').slice(0,20)}-${edge}.webp`;
      if(accepted)await writeFile(join(output,path),buffer);
      work[field]=accepted?path:work.image;
      entry.variants.push({field,path:work[field],width:accepted?info.width:metadata.autoOrient.width,height:accepted?info.height:metadata.autoOrient.height,bytes:accepted?buffer.length:input.length,quality:accepted?quality:'original',psnr:accepted?(Number.isFinite(score)?Number(score.toFixed(3)):'lossless'):null});
    }
    work.variants=[...new Set([...(work.variants||[]),work.thumbnail,work.mobilePreview,work.preview])];
    report.push(entry);
  }
  return {catalogue:result,report};
}
