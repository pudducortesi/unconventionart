/** Catalogue can be replaced without changing page templates or interactions. */
export async function loadCatalogue({ publicOnly = false } = {}) {
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
