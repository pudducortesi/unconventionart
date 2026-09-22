export function validatePublishingConfig(value) {
  if (!value || typeof value.enabled !== 'boolean') throw Error('Configurazione pubblicazione non valida.');
  if (!value.enabled) return value;
  const origin = new URL(value.supabaseUrl);
  if (origin.protocol !== 'https:' || !/^[a-z0-9]+\.supabase\.co$/.test(origin.hostname) || origin.pathname !== '/')
    throw Error('Archivio non valido.');
  if (!value.publishableKey || /^(sb_secret_)/.test(value.publishableKey)) throw Error('Chiave pubblica non valida.');
  if (value.publishableKey.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(atob(value.publishableKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role !== 'anon') throw Error();
    } catch { throw Error('È consentita soltanto una chiave pubblica.'); }
  } else if (!value.publishableKey.startsWith('sb_publishable_')) throw Error('Chiave pubblica non valida.');
  if (value.catalogueUrl !== `${origin.origin}/functions/v1/gallery-public/catalogue`) throw Error('Endpoint catalogo non valido.');
  return {...value, supabaseUrl:origin.origin};
}
export async function publishingConfig() {
  const response = await fetch('/data/publishing.json', { cache: 'no-store' });
  if (!response.ok) throw Error('Configurazione pubblicazione non disponibile.');
  return validatePublishingConfig(await response.json());
}
export function validateUpload(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw Error('Usa JPEG, PNG o WebP. Esporta prima i file RAW e HEIC.');
  if (!file.size || file.size > 40 * 1024 * 1024) throw Error('Ogni fotografia deve pesare meno di 40 MB.');
}
export function publicationPatch(title, description, hall, published) {
  title = title.trim(); description = description.trim();
  if (!title || title.length > 160 || description.length > 3000) throw Error('Inserisci un titolo (massimo 160 caratteri) e una descrizione fino a 3000 caratteri.');
  const hallIndex = hall === '' ? null : Number(hall);
  if (hallIndex !== null && (!Number.isInteger(hallIndex) || hallIndex < 0 || hallIndex > 9)) throw Error('Sala non valida.');
  return { title, description, hall_index: hallIndex, published: !!published };
}
