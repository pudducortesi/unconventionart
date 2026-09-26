import {validateVRMBuffer} from './vrm-file.js';
const $=s=>document.querySelector(s);let preview=null,generation=0;
$('#editor-open').onclick=()=>{const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2');if(!gl){$('#editor-status').textContent='L’editor richiede WebGL 2. Apri questa pagina in un browser con accelerazione grafica disponibile.';return;}gl.getExtension('WEBGL_lose_context')?.loseContext();const frame=$('#characterstudio');frame.src||= '/characterstudio/';frame.hidden=false;$('#editor-open').hidden=true;};
$('#vrm-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;const token=++generation;
 try{if(file.size>25*1024*1024)throw Error('Massimo 25 MB.');const buffer=await file.arrayBuffer();validateVRMBuffer(buffer);$('#vrm-status').textContent='Preparazione avatar…';const {createVRMPreview}=await import('../vendor/vrm-preview.js');if(token!==generation)return;preview?.dispose();preview=null;const next=await createVRMPreview($('#vrm-preview'),buffer);if(token!==generation){next.dispose();return;}preview=next;$('#vrm-reset').disabled=false;$('#vrm-status').textContent='Anteprima locale pronta. Trascina per ruotare il personaggio.';}catch(error){if(token===generation)$('#vrm-status').textContent=error.message||'Impossibile leggere il modello.';}
};
$('#vrm-reset').onclick=()=>{generation++;preview?.dispose();preview=null;$('#vrm-file').value='';$('#vrm-reset').disabled=true;$('#vrm-status').textContent='Anteprima rimossa.';};
addEventListener('pagehide',()=>{generation++;preview?.dispose();});
