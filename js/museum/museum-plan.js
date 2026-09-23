import { HALLS } from './layout.js';
export function museumPlan(open = new Set()) {
  return Array.from({length:4},(_,floor)=>({
    floor, title:floor===0?'Piano terra':`Piano ${floor}`,
    rooms:Array.from({length:10},(_,index)=>({
      number:floor*10+index+1,
      title:floor===0?HALLS[index].profile.name:`Sala ${floor*10+index+1}`,
      status:floor===0?(open.has(index)?'Aperta':'Chiusa'):'Prevista',
      hallIndex:floor===0?index:null,
    })),
  }));
}
