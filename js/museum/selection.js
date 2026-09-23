// Store only public catalogue IDs; shared links never supply image URLs or markup.
export function createSelection(allowed, storage) {
  const valid = new Set(allowed), key = 'ua-selection-v1';
  const clean = ids => [...new Set(Array.isArray(ids) ? ids : [])].filter(id => valid.has(id)).slice(0, 200);
  let ids = [], persistent = false;
  try { ids = clean(JSON.parse(storage?.getItem(key) || '[]')); } catch {}
  function replace(next) {
    ids = clean(next); persistent = false;
    try { if (storage) { storage.setItem(key, JSON.stringify(ids)); persistent = true; } } catch {}
  }
  return { ids: () => [...ids], has: id => ids.includes(id), replace,
    get persistent() { return persistent; },
    toggle(id) { replace(ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]); },
  };
}
export function selectionFromHash(hash, allowed) {
  const raw = new URLSearchParams(hash.slice(1)).get('selection');
  if (raw === null) return null;
  if (raw.length > 20000) return [];
  try { const ids = JSON.parse(raw); return Array.isArray(ids) ? [...new Set(ids)].filter(id => allowed.includes(id)).slice(0, 200) : []; } catch { return []; }
}
export function selectionLink(href, ids) {
  const url = new URL(href); url.hash = new URLSearchParams({ selection: JSON.stringify(ids) }).toString();
  return url.href;
}
