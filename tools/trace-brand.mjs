// Convert the existing monochrome identity into contours for physical relief.
import fs from 'node:fs';
import sharp from 'sharp';
const svg=fs.readFileSync('images/site/brand-original.svg','utf8');
const source=Buffer.from(svg.match(/base64,([^"\s]+)/)[1],'base64');
const {data,info}=await sharp(source).extract({left:70,top:330,width:860,height:335}).greyscale().raw().toBuffer({resolveWithObject:true});
const {width:w,height:h}=info;
const ink=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&data[y*w+x]<120;
const edges=new Map();
const add=(a,b)=>{const k=a.join(',');if(!edges.has(k))edges.set(k,[]);edges.get(k).push(b);};
for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(ink(x,y)){
 if(!ink(x,y-1))add([x,y],[x+1,y]);
 if(!ink(x+1,y))add([x+1,y],[x+1,y+1]);
 if(!ink(x,y+1))add([x+1,y+1],[x,y+1]);
 if(!ink(x-1,y))add([x,y+1],[x,y]);
}
// Ramer–Douglas–Peucker removes raster stairs while preserving corners and
// the winding of each closed contour, including the counters inside letters.
function simplify(points, tolerance=.9) {
 if(points.length<3)return points;
 const a=points[0],b=points.at(-1),dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
 let maximum=0,index=0;
 for(let i=1;i<points.length-1;i++){
  const p=points[i],t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0;
  const d=Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
  if(d>maximum){maximum=d;index=i;}
 }
 return maximum>tolerance ? [...simplify(points.slice(0,index+1),tolerance).slice(0,-1),...simplify(points.slice(index),tolerance)] : [a,b];
}
const paths=[];
while(edges.size){
 const start=edges.keys().next().value;let key=start;const pts=[];
 do{const list=edges.get(key);if(!list)break;pts.push(key.split(',').map(Number));const next=list.pop();if(!list.length)edges.delete(key);key=next.join(',');}while(key!==start);
 const area=pts.reduce((sum,p,i)=>{const q=pts[(i+1)%pts.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2;
 if(Math.abs(area)<4)continue;
 const reduced=pts.filter((p,i)=>{const a=pts[(i+pts.length-1)%pts.length],b=pts[(i+1)%pts.length];return (p[0]-a[0])*(b[1]-p[1])!==(p[1]-a[1])*(b[0]-p[0]);});
 // Split the ring into two open arcs before simplifying (no coincident ends).
 const half=Math.floor(reduced.length/2);
 const clean=[...simplify(reduced.slice(0,half+1)).slice(0,-1),...simplify([...reduced.slice(half),reduced[0]]).slice(0,-1)];
 if(clean.length>=3)paths.push(clean);
}
fs.writeFileSync('js/museum/brand-contours.js','// Traced from the original identity; contours include letter counters.\nexport const BRAND_CONTOURS = '+JSON.stringify(paths)+';\n');
console.log(paths.length+' contours');
