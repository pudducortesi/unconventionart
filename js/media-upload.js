export function mediaInfo(file) {
  const ext = file.name?.split('.').pop().toLowerCase();
  const type = file.type || ({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',mp4:'video/mp4',webm:'video/webm'}[ext]);
  const video = ['video/mp4','video/webm'].includes(type);
  if (!video && !['image/jpeg','image/png','image/webp'].includes(type)) throw Error('Formato non supportato: usa JPEG, PNG, WebP oppure video MP4 (H.264) o WebM. Esporta HEIC, RAW e MOV prima del caricamento.');
  const limit = (video ? 50 : 40) * 1024 * 1024;
  if (!file.size || file.size > limit) throw Error(`Il file deve pesare al massimo ${video ? 50 : 40} MB.`);
  return {type,video,ext:({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'})[type]};
}
export async function prepareMedia(file, info = mediaInfo(file)) {
  const url = URL.createObjectURL(file);
  const media = document.createElement(info.video ? 'video' : 'img');
  try {
    if (info.video) { media.muted = true; media.playsInline = true; media.preload = 'auto'; }
    await new Promise((resolve,reject)=>{
      const timer = setTimeout(()=>reject(Error('Preparazione troppo lenta. Scarica prima il file sul dispositivo e riprova.')),45000);
      media.addEventListener(info.video ? 'loadeddata' : 'load',()=>{clearTimeout(timer);resolve();},{once:true});
      media.addEventListener('error',()=>{clearTimeout(timer);reject(Error(info.video ? 'Video non leggibile: esporta MP4 con codec H.264.' : 'Immagine non leggibile. Esporta una copia JPEG.'));},{once:true});
      media.src = url;
    });
    const width = info.video ? media.videoWidth : media.naturalWidth, height = info.video ? media.videoHeight : media.naturalHeight;
    if (!width || !height || width*height > 80000000) throw Error('Dimensioni non supportate: massimo 80 megapixel.');
    const canvas = document.createElement('canvas'), scale = Math.min(1,1536/Math.max(width,height));
    canvas.width = Math.max(1,Math.round(width*scale)); canvas.height = Math.max(1,Math.round(height*scale));
    const ctx = canvas.getContext('2d'); ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(media,0,0,canvas.width,canvas.height);
    const blob = await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.9));
    canvas.width=canvas.height=1;
    if (!blob || blob.size>4194304) throw Error('Impossibile creare l’anteprima.');
    return {blob,width,height,duration:info.video && Number.isFinite(media.duration) ? media.duration : 0};
  } finally { if(info.video)media.pause();media.removeAttribute('src');if(info.video)media.load();URL.revokeObjectURL(url); }
}
export function uploadWithProgress({url,headers,body,onProgress=()=>{},xhrFactory=()=>new XMLHttpRequest()}) {
  return new Promise((resolve,reject)=>{
    const xhr=xhrFactory();xhr.open('POST',url);xhr.timeout=600000;
    for(const [key,value] of Object.entries(headers))xhr.setRequestHeader(key,value);
    xhr.upload.onprogress=e=>onProgress(e.lengthComputable ? e.loaded/e.total : null);
    xhr.onerror=()=>reject(Error('Connessione interrotta. Riprova il file.'));
    xhr.ontimeout=()=>reject(Error('Caricamento scaduto. Verifica la connessione e riprova.'));
    xhr.onload=()=>{
      if(xhr.status>=200&&xhr.status<300)return resolve();
      reject(Error(xhr.status===401 ? 'Sessione scaduta. Accedi di nuovo.' : xhr.status===413 ? 'File troppo grande per l’archivio.' : `Caricamento rifiutato (${xhr.status}). Riprova o segnala questo codice.`));
    };
    xhr.send(body);
  });
}
