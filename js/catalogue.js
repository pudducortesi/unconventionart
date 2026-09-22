/** Catalogue can be replaced without changing page templates or interactions. */
import { publishingConfig } from './publishing.js';
export async function loadCatalogue({ publicOnly = false } = {}) {
  const publishing = await publishingConfig();
  if (publishing.enabled) {
    const response = await fetch(publishing.catalogueUrl, {cache:'no-store'});
    if (!response.ok) throw Error('La collezione è temporaneamente non disponibile. Riprova tra poco.');
    const data = await response.json();
    if (!Array.isArray(data.works) || !Array.isArray(data.collections)) throw Error('Catalogo non valido.');
    // A retired work must never reappear from the old static catalogue.
    // Reload open galleries when the published selection changes.
    const revision = data.revision;
    setInterval(async () => {
      if (document.hidden) return;
      try {
        const next = await fetch(publishing.catalogueUrl, {cache:'no-store'});
        if (!next.ok) return;
        const value = await next.json();
        if (typeof value.revision === 'string' && value.revision !== revision) location.reload();
      } catch { /* A connection error is not a catalogue deletion. */ }
    }, 60000);
    return data;
  }
  // Local photographs are excluded from both git and the production build.
  // Only the local development server supports this preview override.
  const local = ["localhost", "127.0.0.1", "terminal.local"].includes(
    location.hostname,
  );
  const paths =
    local && !publicOnly
      ? ["data/local-catalogue.json", "data/catalogue.json"]
      : ["data/catalogue.json"];
  for (const path of paths) {
    try {
      const response = await fetch(path);
      if (!response.ok) continue;
      const data = await response.json();
      if (!Array.isArray(data.works) || !Array.isArray(data.collections))
        continue;
      return data;
    } catch {
      /* Try the public catalogue if the local override is absent. */
    }
  }
  throw new Error("Il catalogo non è disponibile. Riprova tra poco.");
}
export function imageElement(work, lazy = true) {
  const image = new Image();
  image.src = work.image;
  image.alt = work.alt || work.title;
  image.loading = lazy ? "lazy" : "eager";
  image.decoding = "async";
  return image;
}
export function artCard(work) {
  const link = document.createElement("a");
  link.className = "art-card";
  link.href = `exhibitions.html#work=${encodeURIComponent(work.id)}`;
  link.dataset.work = work.id;
  link.dataset.cursor = "GUARDA";
  const frame = document.createElement("div");
  frame.className = "art-image";
  frame.append(imageElement(work));
  const meta = document.createElement("div");
  meta.className = "art-meta";
  const title = document.createElement("h3");
  title.textContent = work.title;
  const number = document.createElement("span");
  number.textContent = "↗";
  meta.append(title, number);
  link.append(frame, meta);
  return link;
}
