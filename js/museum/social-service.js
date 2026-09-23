const KEY='ua-social-session-v1';
const errors={ua_login_required:'Accedi per partecipare.',ua_suspended:'Questo profilo è sospeso.',ua_rate_limit:'Attendi un momento e riprova.',ua_profile_required:'Salva prima il tuo avatar.',ua_room_limit:'Hai già tre incontri attivi. Chiudine uno prima di crearne altri.',ua_room_full:'Incontro completo: massimo 16 partecipanti.',ua_invite_invalid:'Invito scaduto o non disponibile.',ua_room_denied:'L’incontro è terminato o non è più accessibile.',ua_forbidden:'Operazione non consentita.',ua_invalid_profile:'Usa un nome tra 2 e 32 caratteri.',ua_invalid_avatar:'Seleziona le opzioni disponibili per l’avatar.',ua_target_invalid:'La persona ha lasciato l’incontro.'};
export async function createSocialService(fetcher=fetch, storage=globalThis.sessionStorage) {
  const configResponse=await fetcher('data/publishing.json',{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!configResponse.ok)throw Error('Connessione agli incontri non disponibile.');
  const config=await configResponse.json();
  if(!config.enabled||!config.supabaseUrl||!config.publishableKey)throw Error('Gli incontri non sono ancora disponibili.');
  let session=null,refreshing=null,generation=0;
  try{session=JSON.parse(storage?.getItem(KEY)||'null');}catch{}
  const save=value=>{session=value;try{if(value)storage?.setItem(KEY,JSON.stringify(value));else storage?.removeItem(KEY);}catch{}};
  const connectionError=()=>Object.assign(Error('Connessione interrotta. Riprova quando la rete è disponibile.'),{code:'ua_connection_error'});
  const changed=()=>Object.assign(Error('La sessione è cambiata. Riprova.'),{code:'ua_session_changed'});
  const invalidate=()=>{generation++;refreshing=null;save(null);};
  const ended=new Set(['refresh_token_not_found','refresh_token_already_used','session_expired','session_not_found','user_banned','user_not_found','invalid_grant','invalid_credentials']);
  async function raw(path,{method='GET',body,auth=true,credentials=auth?session:null}={}) {
    let response;
    try{response=await fetcher(config.supabaseUrl+path,{method,signal:AbortSignal.timeout(15000),headers:{apikey:config.publishableKey,...(credentials?{Authorization:`Bearer ${credentials.access_token}`} :{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});}
    catch{throw connectionError();}
    let data=null;if(response.status!==204)try{data=await response.json();}catch{if(response.ok)throw connectionError();}
    if(!response.ok){
      const detail=data?.message||data?.msg||data?.error_description||data?.error;
      // PostgreSQL application errors use message; Auth has its own stable error code.
      const code=path.includes('/auth/')?(data?.code||data?.error_code||data?.error||detail):detail;
      let message=errors[code]||'Operazione non riuscita. Controlla la connessione e riprova.';
      if(path.includes('/auth/')){
        if(response.status===429)message='Troppi tentativi. Attendi prima di riprovare.';
        else if(response.status>=500||code==='request_timeout')message='Connessione temporaneamente non disponibile. Riprova tra poco.';
        else if(code==='signup_disabled'||detail?.toLowerCase().includes('signup'))message='Le registrazioni non sono ancora aperte. Usa un account già abilitato.';
        else if(code==='email_not_confirmed'||detail?.includes('Email not confirmed'))message='Conferma prima la tua email.';
        else message='Accesso non riuscito. Controlla email e password.';
      }
      if(response.status===401&&auth){
        if(credentials===session)invalidate();
        message='Sessione scaduta. Accedi di nuovo.';
      }
      const error=Error(message);error.code=code;error.status=response.status;throw error;
    }
    return data;
  }
  async function fresh(){
    if(!session)throw Object.assign(Error('Accedi per partecipare.'),{code:'ua_login_required'});
    if(session.expires_at*1000>Date.now()+90000)return;
    if(!refreshing){
      const previous=session,token=generation;
      const job={};refreshing=job;
      job.promise=raw('/auth/v1/token?grant_type=refresh_token',{method:'POST',auth:false,body:{refresh_token:previous.refresh_token}})
        .then(value=>{if(token!==generation)throw changed();if(!value?.access_token||!value?.refresh_token||!value?.user)throw connectionError();save(value);})
        .catch(error=>{
          if(token!==generation)throw changed();
          if(ended.has(error.code)||error.status===401){invalidate();error.message='Sessione scaduta. Accedi di nuovo.';}
          throw error;
        }).finally(()=>{if(refreshing===job)refreshing=null;});
    }
    await refreshing.promise;
  }
  async function authenticate(path,email,password){
    invalidate();const token=generation;
    const result=await raw(path,{method:'POST',auth:false,body:{email,password}});
    if(token!==generation)throw changed();
    if(result?.access_token)save(result);
    return !!result?.access_token;
  }
  return {
    get user(){return session?.user||null;},
    async settings(){return raw('/auth/v1/settings',{auth:false});},
    async login(email,password){await authenticate('/auth/v1/token?grant_type=password',email,password);},
    async signup(email,password){return authenticate('/auth/v1/signup',email,password);},
    async logout(){const previous=session;invalidate();if(previous)await raw('/auth/v1/logout?scope=local',{method:'POST',credentials:previous});},
    async rpc(action,payload={}){
      const token=generation;await fresh();if(token!==generation)throw changed();
      const data=await raw('/rest/v1/rpc/ua_social',{method:'POST',body:{action,payload}});
      if(token!==generation)throw changed();return data;
    },
    async offers(){return raw('/rest/v1/gallery_offers?select=*&published=eq.true',{auth:false});},
  };
}
