const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function validId(value){return typeof value==='string'&&uuid.test(value);}
export function createSocialAccess({url,key,fetcher=fetch}){
 async function request(path,token,body){
  if(!url||!key||typeof token!=='string'||token.length<20||token.length>10000)throw Error('Accesso non disponibile');
  const response=await fetcher(url+path,{method:body?'POST':'GET',signal:AbortSignal.timeout(10000),headers:{apikey:key,Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  if(!response.ok){const error=Error('Accesso all’incontro negato');error.status=response.status;throw error;}return response.json();
 }
 return {user:token=>request('/auth/v1/user',token),async join(token,invite){if(!validId(invite))throw Error('Invito non valido');return request('/rest/v1/rpc/ua_social',token,{action:'join',payload:{invite}});},async snapshot(token,room,position){if(!validId(room))throw Error('Incontro non valido');return request('/rest/v1/rpc/ua_social',token,{action:'tick',payload:{room,position}});}};
}
