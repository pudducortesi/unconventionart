import { INITIAL, INITIAL_TARGET } from './layout.js';

export function welcomeRoute(slots) {
  const ground=slots.findIndex(slot=>!(slot.floorY>0));
  const upper=slots.findIndex(slot=>slot.floorY>0);
  return [
    {position:INITIAL,look:INITIAL_TARGET,title:'Benvenuto / UnconventionArt',description:'Prenditi un momento nella hall. Avanza quando vuoi: cammineremo insieme verso la mostra. Puoi sempre fermarti e muoverti liberamente.'},
    {position:{x:0,z:-7,floorY:0},look:{x:-5,y:2.3,z:-13},title:'La soglia / Verso Officina',description:'La promenade introduce la mostra. La sala aperta è sulla sinistra: scegli Prossima tappa per entrare.'},
    ...(ground<0?[]:[{hallIndex:slots[ground].hallIndex,title:'Officina / La collezione',description:`${slots.length} fotografie, due livelli e composizioni da osservare con calma. Prima incontriamo le opere al piano terra.`},
      {workIndex:ground,title:'Piano terra / Guarda da vicino',description:'Clicca la fotografia per aprirla su fondo scuro. Chiudila per ritrovarti nello stesso punto. Prossima tappa ti accompagna al livello superiore.'}]),
    ...(upper<0?[]:[{workIndex:upper,title:'Soppalco / Un altro punto di vista',description:'Il percorso sale lungo la scala. Fermati, guarda le composizioni e apri le immagini che ti interessano; puoi proseguire liberamente su questo livello.'}]),
    {position:INITIAL,look:INITIAL_TARGET,title:'La hall / Fine del percorso',description:'Torniamo all’accoglienza passando dalla scala e dalla promenade. La galleria resta aperta: puoi riprendere la visita o ritrovare le foto nella tua selezione.'},
  ];
}
