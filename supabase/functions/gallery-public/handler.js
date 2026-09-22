const idPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const headers = {'Access-Control-Allow-Origin':'*','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json = (value, status=200) => new Response(JSON.stringify(value), {status,headers:{...headers,'Content-Type':'application/json'}});
export function createPublicGallery({url,serviceKey,fetchImpl=fetch}) {
  const apiHeaders = {apikey:serviceKey,Authorization:`Bearer ${serviceKey}`};
  return async request => {
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, OPTIONS'}});
    if (request.method !== 'GET') return json({error:'Method not allowed'},405);
    if (!url || !serviceKey) return json({error:'Archive unavailable'},503);
    const path = new URL(request.url).pathname.split('/gallery-public/')[1] || '';
    try {
      if (path === 'catalogue') {
        const response = await fetchImpl(`${url}/rest/v1/gallery_artworks?published=eq.true&select=id,title,description,credit,hall_index,wall_slot,updated_at&order=created_at.asc&limit=201`,{headers:apiHeaders,signal:AbortSignal.timeout(10000)});
        if (!response.ok) throw Error();
        const rows = await response.json();
        if (!Array.isArray(rows) || rows.length > 200) throw Error();
        const base = `${url}/functions/v1/gallery-public/image/`;
        const works = rows.map(row=>({id:row.id,title:row.title,description:row.description,credit:row.credit,collection:'atelier',medium:'Fotografia digitale',hallIndex:row.hall_index,wallSlot:row.wall_slot,image:base+row.id,preview:base+row.id,mobilePreview:base+row.id,thumbnail:base+row.id}));
        return json({works,collections:[{id:'atelier',title:'UnconventionArt',description:'La collezione fotografica.',color:'#b99363'}],hero:works[0]?.image || null,revision:rows.map(r=>`${r.id}:${r.updated_at}`).join('|')});
      }
      const parts = path.split('/');
      if (parts.length !== 2 || parts[0] !== 'image' || !idPattern.test(parts[1])) return json({error:'Not found'},404);
      const id = parts[1];
      const response = await fetchImpl(`${url}/rest/v1/gallery_artworks?id=eq.${id}&published=eq.true&select=id,preview_path`,{headers:apiHeaders,signal:AbortSignal.timeout(10000)});
      if (!response.ok) throw Error();
      const rows = await response.json();
      if (rows.length !== 1 || rows[0].id !== id || rows[0].preview_path !== `${id}/preview.jpg`) return json({error:'Not found'},404);
      const photo = await fetchImpl(`${url}/storage/v1/object/authenticated/gallery-previews/${id}/preview.jpg`,{headers:apiHeaders,signal:AbortSignal.timeout(15000)});
      if (!photo.ok) throw Error();
      const bytes = await photo.arrayBuffer();
      if (bytes.byteLength > 4194304 || new Uint8Array(bytes)[0] !== 255 || new Uint8Array(bytes)[1] !== 216) throw Error();
      return new Response(bytes,{headers:{...headers,'Content-Type':'image/jpeg','Content-Disposition':'inline'}});
    } catch { return json({error:'Archive temporarily unavailable'},503); }
  };
}
