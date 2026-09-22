import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaInfo,uploadWithProgress} from '../js/media-upload.js';
test('photo picker files with missing MIME are accepted by extension; video limits are explicit',()=>{
 assert.equal(mediaInfo({name:'IMG_1.JPG',type:'',size:100}).type,'image/jpeg');
 assert.equal(mediaInfo({name:'film.mp4',type:'video/mp4',size:50*1024*1024}).video,true);
 for(const file of [{name:'film.mp4',type:'video/mp4',size:51*1024*1024},{name:'image.heic',type:'image/heic',size:100},{name:'x.jpg',type:'text/html',size:100}])assert.throws(()=>mediaInfo(file));
});
test('upload reports progress and rejects network failures or storage errors',async()=>{
 const make=status=>({upload:{},open(){},setRequestHeader(){},send(){this.status=status;this.upload.onprogress({lengthComputable:true,loaded:50,total:100});this.onload();}});
 let progress;await uploadWithProgress({url:'https://example.test',headers:{},body:'x',onProgress:p=>progress=p,xhrFactory:()=>make(200)});assert.equal(progress,.5);
 await assert.rejects(uploadWithProgress({url:'https://example.test',headers:{},body:'x',xhrFactory:()=>make(403)}),/403/);
 await assert.rejects(uploadWithProgress({url:'https://example.test',headers:{},body:'x',xhrFactory:()=>({...make(200),send(){this.onerror();}})}),/Connessione/);
});
