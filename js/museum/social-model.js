export const AVATAR_OPTIONS = {
  skin: ['#f2d3b1','#dca77d','#b87952','#875338','#503528'],
  hair: ['#211c1a','#68412c','#c69b55','#d8d5ce','#95335e'],
  outfit: ['#20242c','#eee9df','#793a57','#31546b','#3e6555','#cc754b'],
  style: ['short','bob','long','shaved'], build: ['slim','regular','broad'],
};
export const DEFAULT_AVATAR = {skin:'#dca77d',hair:'#211c1a',outfit:'#31546b',style:'short',build:'regular'};
export function normalizeAvatar(value={}) {
  return Object.fromEntries(Object.entries(AVATAR_OPTIONS).map(([key,options])=>[key,options.includes(value?.[key])?value[key]:DEFAULT_AVATAR[key]]));
}
export function inviteCode(value) {
  const raw=String(value||'').trim();
  let code=raw;
  try { if(raw.includes('://')) code=new URL(raw).hash.replace(/^#visit=/,''); } catch { return null; }
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(code)?code.toLowerCase():null;
}
export function safePose(value) {
  const p={x:Number(value?.x),z:Number(value?.z),y:Number(value?.y??0),yaw:Number(value?.yaw??0)};
  if(!Object.values(p).every(Number.isFinite)||Math.abs(p.x)>100||p.z< -200||p.z>100||p.y<0||p.y>30) return null;
  p.yaw=((p.yaw+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
  return p;
}
export function offerURL(offer) {
  try {
    const u=new URL(offer.checkout_url);
    if(u.protocol!=='https:'||u.username||u.password||u.port||!Number.isInteger(offer.amount_minor)||offer.amount_minor<=0||!offer.rights?.trim())return null;
    if(offer.kind==='nft') {
      if(!['ethereum','base','matic'].includes(offer.chain)||!/^0x[a-f0-9]{40}$/i.test(offer.contract||'')||!/^\d+$/.test(offer.token_id||''))return null;
      if(u.hostname!=='opensea.io'||u.pathname!==`/assets/${offer.chain}/${offer.contract}/${offer.token_id}`)return null;
    } else if(!['print','digital'].includes(offer.kind)||!['buy.stripe.com','checkout.stripe.com'].includes(u.hostname))return null;
    return u.href;
  }catch{return null;}
}
