import {normalizeAvatar,DEFAULT_AVATAR,AVATAR_OPTIONS,AVATAR_RANGES} from './social-model.js';
export const BODY_PRESETS=[
  {name:'Equilibrata',avatar:{height:100,build:'regular',shoulders:100,waist:100,hips:100,faceWidth:100,jaw:100}},
  {name:'Slanciata',avatar:{height:112,build:'slim',shoulders:94,waist:88,hips:96,faceWidth:94,jaw:92}},
  {name:'Atletica',avatar:{height:105,build:'regular',shoulders:115,waist:93,hips:94,faceWidth:103,jaw:114}},
  {name:'Morbida',avatar:{height:98,build:'broad',shoulders:98,waist:111,hips:114,faceWidth:108,jaw:96}},
  {name:'Minuta',avatar:{height:88,build:'slim',shoulders:88,waist:94,hips:94,faceWidth:98,jaw:91}},
];
export const STUDIO_PRESETS=[
  {name:'Curatrice',avatar:{...BODY_PRESETS[1].avatar,model:'atelier',garment:'jacket',style:'bob',outfit:'#20242c',trousers:'#292c33',shoes:'#714b30',glasses:'round',frame:'gold',hair:'#68412c'}},
  {name:'Vernissage',avatar:{...BODY_PRESETS[3].avatar,model:'atelier',garment:'dress',style:'bun',outfit:'#793a57',trousers:'#292c33',shoes:'#17191d',skin:'#b87952'}},
  {name:'Architetta',avatar:{...BODY_PRESETS[2].avatar,model:'atelier',garment:'shirt',style:'short',outfit:'#eee9df',trousers:'#31546b',shoes:'#714b30',glasses:'square'}},
  {name:'Artista',avatar:{...BODY_PRESETS[0].avatar,model:'atelier',garment:'tshirt',style:'long',outfit:'#cc754b',trousers:'#292c33',shoes:'#eee9df',hair:'#95335e'}},
  {name:'Notturno',avatar:{...BODY_PRESETS[4].avatar,model:'atelier',garment:'jacket',style:'bald',outfit:'#31546b',trousers:'#eee9df',shoes:'#17191d',skin:'#503528'}},
  {name:'Sage',avatar:{...BODY_PRESETS[1].avatar,model:'atelier',garment:'dress',style:'long',outfit:'#3e6555',trousers:'#292c33',shoes:'#714b30',hair:'#d8d5ce'}},
  {name:'Street · stilizzato',avatar:{model:'studio',garment:'tshirt',style:'mohawk',hair:'#95335e',outfit:'#eee9df',trousers:'#292c33'}},
  {name:'Minimal · stilizzato',avatar:{model:'studio',garment:'shirt',style:'bald',beard:'stubble',outfit:'#20242c',skin:'#875338'}},
];
export function createAvatarHistory(initial){
  let current=normalizeAvatar(initial),past=[],future=[];
  return {get value(){return {...current};},get canUndo(){return !!past.length;},get canRedo(){return !!future.length;},
    set(value){const next=normalizeAvatar(value);if(JSON.stringify(next)===JSON.stringify(current))return false;past.push(current);past=past.slice(-40);future=[];current=next;return true;},
    reset(value){current=normalizeAvatar(value);past=[];future=[];},
    undo(){if(past.length){future.push(current);current=past.pop();}return this.value;},
    redo(){if(future.length){past.push(current);current=future.pop();}return this.value;},
  };
}
export function randomAvatar(random=Math.random,model='studio'){
  const value={...DEFAULT_AVATAR};
  for(const [key,options]of Object.entries(AVATAR_OPTIONS))value[key]=options[Math.min(options.length-1,Math.floor(Math.max(0,random())*options.length))];
  for(const [key,[min,max]]of Object.entries(AVATAR_RANGES))value[key]=Math.round(min+Math.max(0,Math.min(1,random()))*(max-min));
  value.model=AVATAR_OPTIONS.model.includes(model)?model:'studio';return normalizeAvatar(value);
}
const KEY='ua-avatar-looks-v1';
export function createLookStore(storage){
  function read(){try{const raw=storage?.getItem(KEY);if(!raw||raw.length>30000)return [];const data=JSON.parse(raw);if(!Array.isArray(data))return [];return data.slice(0,8).filter(x=>typeof x?.name==='string').map(x=>({name:x.name.slice(0,32),avatar:normalizeAvatar(x.avatar)}));}catch{return [];}}
  function write(looks){if(!storage)throw Error('Salvataggio sul dispositivo non disponibile.');try{storage.setItem(KEY,JSON.stringify(looks));}catch{throw Error('Impossibile salvare il look sul dispositivo.');}}
  return {read,save(name,avatar){name=String(name).trim().slice(0,32);if(!name)throw Error('Dai un nome al look.');const looks=read();if(looks.length>=8)throw Error('Hai già 8 look: eliminane uno prima di salvarne un altro.');looks.push({name,avatar:normalizeAvatar(avatar)});write(looks);return looks;},remove(index){const looks=read();if(Number.isInteger(index)&&index>=0&&index<looks.length){looks.splice(index,1);write(looks);}return looks;}};
}
export function exportAvatar(avatar){return JSON.stringify({format:'unconventionart-avatar',version:1,avatar:normalizeAvatar(avatar)},null,2);}
export function importAvatar(text){
  if(typeof text!=='string'||text.length>12000)throw Error('File avatar troppo grande.');
  let data;try{data=JSON.parse(text);}catch{throw Error('File avatar non leggibile.');}
  if(data?.format!=='unconventionart-avatar'||data.version!==1||!data.avatar||typeof data.avatar!=='object'||Array.isArray(data.avatar))throw Error('Formato avatar non riconosciuto.');
  return normalizeAvatar(data.avatar);
}
