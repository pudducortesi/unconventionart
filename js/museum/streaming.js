/**
 * Keep only nearby photographs on the GPU. Slots retain their catalogue indices
 * even while their textures are absent, so navigation never depends on loading.
 *
 * `unmount` owns disposal and must also accept a loaded art object that was never
 * mounted (for example, when the visitor walks away during a texture request).
 */
export function createArtStream({
  slots,
  load,
  mount,
  unmount,
  limit = 24,
  concurrency = 2,
  onError = () => {},
  radius = 45,
  retryDelay = 3000,
  now = () => Date.now(),
}) {
  const capacity = Math.max(1, Math.floor(limit));
  const parallel = Math.max(1, Math.min(2, Math.floor(concurrency)));
  const resident = new Map();
  const loading = new Map();
  const requests = new Map();
  const holds = new Set();
  const failures = new Map();
  let nearest = [];
  let wanted = new Set();
  let selected = -1;
  let lastPosition = null;
  let disposed = false;
  let pumping = false;
  let pumpAgain = false;

  const valid = (index) =>
    Number.isInteger(index) && index >= 0 && index < slots.length;
  const canRetry = (index) => (failures.get(index)?.retryAt ?? 0) <= now();

  function report(error, index) {
    // A reporting callback must not interrupt resource cleanup or the queue.
    try {
      onError(error, index);
    } catch {}
  }

  function release(art, index) {
    try {
      unmount(art, index);
    } catch (error) {
      report(error, index);
    }
  }

  function settleRequest(index, art) {
    const request = requests.get(index);
    if (!request) return;
    requests.delete(index);
    if (art) holds.add(index);
    request.resolve(art);
  }

  function recordFailure(error, index) {
    const attempts = (failures.get(index)?.attempts ?? 0) + 1;
    failures.set(index, {
      attempts,
      retryAt: now() + retryDelay * 2 ** Math.min(attempts - 1, 5),
    });
    report(error, index);
    settleRequest(index, null);
  }

  function reconcile() {
    if (disposed) return;
    const priorities = new Set([
      ...requests.keys(),
      ...(valid(selected) ? [selected] : []),
      ...holds,
      ...nearest,
    ]);
    wanted = new Set([...priorities].slice(0, capacity));
    for (const index of holds) if (!wanted.has(index)) holds.delete(index);
    for (const [index, art] of resident) {
      if (wanted.has(index)) continue;
      resident.delete(index);
      release(art, index);
    }
    pump();
  }

  async function fetchArt(index, token) {
    let art = null;
    let released = false;
    try {
      art = await load(slots[index], index);
      if (!art) throw new Error(`Photograph ${index} did not load`);
      if (disposed || !wanted.has(index)) {
        failures.delete(index);
        release(art, index);
        released = true;
        settleRequest(index, null);
      } else {
        resident.set(index, art);
        mount(art, index);
        failures.delete(index);
        settleRequest(index, disposed ? null : art);
      }
    } catch (error) {
      if (art && !released) {
        resident.delete(index);
        release(art, index);
      }
      if (!disposed) recordFailure(error, index);
    } finally {
      if (loading.get(index) === token) loading.delete(index);
      reconcile();
    }
  }

  function pump() {
    if (disposed) return;
    if (pumping) {
      pumpAgain = true;
      return;
    }
    pumping = true;
    try {
      do {
        pumpAgain = false;
        for (const index of wanted) {
          if (disposed || loading.size >= parallel) break;
          if (
            !wanted.has(index) ||
            resident.has(index) ||
            loading.has(index) ||
            !canRetry(index)
          )
            continue;
          const token = {};
          loading.set(index, token);
          void fetchArt(index, token);
        }
      } while (pumpAgain && !disposed && loading.size < parallel);
    } finally {
      pumping = false;
    }
  }

  function update(
    position,
    { selected: nextSelected = -1, force = false } = {},
  ) {
    if (disposed) return;
    holds.clear();
    selected = valid(nextSelected) ? nextSelected : -1;
    if (
      position &&
      Number.isFinite(position.x) &&
      Number.isFinite(position.z) &&
      (force ||
        !lastPosition ||
        Math.hypot(position.x - lastPosition.x, position.z - lastPosition.z, (position.floorY || 0) - (lastPosition.floorY || 0)) >=
          0.5)
    ) {
      lastPosition = { x: position.x, z: position.z, floorY: position.floorY || 0 };
      const maxDistance = radius * radius;
      nearest = slots
        .map((slot, index) => ({
          index,
          distance: (slot.x - position.x) ** 2 + (slot.z - position.z) ** 2 + ((slot.floorY || 0) - (position.floorY || 0)) ** 2,
        }))
        .filter(({ distance }) => distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance || a.index - b.index)
        .slice(0, capacity)
        .map(({ index }) => index);
    }
    // Still pump while stationary: an earlier failure may now be retryable.
    reconcile();
  }

  function ensure(index) {
    if (disposed || !valid(index)) return Promise.resolve(null);
    if (resident.has(index)) {
      holds.add(index);
      return Promise.resolve(resident.get(index));
    }
    if (requests.has(index)) return requests.get(index).promise;
    if (!canRetry(index)) return Promise.resolve(null);
    let resolve;
    const promise = new Promise((done) => {
      resolve = done;
    });
    requests.set(index, { promise, resolve });
    reconcile();
    return promise;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    wanted.clear();
    nearest = [];
    holds.clear();
    failures.clear();
    for (const request of requests.values()) request.resolve(null);
    requests.clear();
    for (const [index, art] of resident) release(art, index);
    resident.clear();
    // Outstanding TextureLoader promises are allowed to settle; fetchArt will
    // dispose their results without mounting them or starting another request.
  }

  return {
    update,
    ensure,
    get: (index) => resident.get(index) ?? null,
    values: () => [...resident.entries()],
    dispose,
  };
}
