// Keep compressed display previews for this visit, not decoded full-size images.
// Publication changes reload the catalogue and discard this in-memory cache.
export function createImageCache({ fetchImage = fetch, makeURL = blob => URL.createObjectURL(blob) } = {}) {
  const entries = new Map();
  return function imageURL(source) {
    if (entries.has(source)) return entries.get(source);
    const request = (async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetchImage(source, {signal: AbortSignal.timeout(20000)});
          if (!response.ok) {
            if ([401, 403, 404].includes(response.status)) return Promise.reject(Error('Fotografia non disponibile.'));
            throw Error('Caricamento temporaneamente non disponibile.');
          }
          const blob = await response.blob();
          if (!blob.size || !blob.type.startsWith('image/')) throw Error('Anteprima non valida.');
          return makeURL(blob);
        } catch (error) {
          if (attempt === 2) throw error;
        }
      }
    })();
    entries.set(source, request);
    request.catch(() => entries.delete(source));
    return request;
  };
}
export const displayImageURL = createImageCache();
