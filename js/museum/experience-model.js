export const WALLS = [
  { id: 'ecru', label: 'Ecrù · gesso', color: '#e8e2d6' },
  { id: 'clay', label: 'Argilla · terra', color: '#ad6955' },
  { id: 'night', label: 'Notturno · carbone', color: '#282e33' },
  { id: 'sage', label: 'Salvia · calce', color: '#89917e' },
];
export function secureLink(value, hosts) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && hosts.some(h => u.hostname === h || u.hostname.endsWith('.' + h)) ? u.href : null; } catch { return null; }
}
export function offerFor(work, config) {
  const o = config?.offers?.[work.id];
  if (!o || o.published !== true) return null;
  const checkout = secureLink(o.checkout, ['buy.stripe.com', 'checkout.stripe.com']);
  const nft = secureLink(o.nft, ['manifold.xyz', 'opensea.io']);
  return { ...o, checkout, nft };
}
export function editorialAnswer(question, work, collection) {
  const q = question.toLocaleLowerCase('it');
  if (/prezz|compr|acquist|nft|edizion|costa/.test(q)) return 'Nello Studio trovi le informazioni di collezione disponibili per questa opera. Prezzi e tirature vengono mostrati solo quando pubblicati dall’autore.';
  if (/tecnic|scatt|realizz|camera|obiettiv/.test(q)) return `${work.medium || 'Fotografia'}. ${work.process || 'Il catalogo non contiene ancora un racconto della lavorazione o dati sullo scatto.'}`;
  if (/autor|chi |modella|credit/.test(q)) return `Crediti pubblicati: ${work.credit || 'UnconventionArt'}. ${work.authorNote || 'Non sono disponibili altre informazioni biografiche nella scheda.'}`;
  if (/serie|collezion|progett/.test(q)) return `${collection?.title || 'UnconventionArt'}. ${collection?.description || ''}`;
  if (/raccont|ved|guard|oper|ritratt|significat|dettagl/.test(q)) return work.description || work.alt || 'La descrizione di questa opera non è ancora disponibile.';
  return 'Posso accompagnarti fra descrizione, serie, tecnica e crediti pubblicati. Prova “Raccontami l’opera” oppure “Come è stata realizzata?”.';
}
export function selectionDocument(works) {
  return { schema: 'unconventionart.selection.v1', createdAt: new Date().toISOString(), works: works.map(w => ({ id:w.id, title:w.title, collection:w.collection, description:w.description || w.alt || '', credit:w.credit || 'UnconventionArt' })) };
}
