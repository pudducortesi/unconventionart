// Fullscreen belongs to an explicit visit. Never request it from a change event
// or after Escape; a cancelled request must also release a late fullscreen entry.
export function createVisitFullscreen(doc, onExit) {
  const page = doc.documentElement;
  let wanted = false, owned = false, pending = false, exiting = false, disposed = false;

  function exit() {
    wanted = false;
    if (!owned || doc.fullscreenElement !== page || exiting) return;
    exiting = true;
    try {
      Promise.resolve(doc.exitFullscreen()).catch(() => {}).finally(() => { exiting = false; });
    } catch { exiting = false; }
  }
  function changed() {
    if (!owned) return;
    if (doc.fullscreenElement === page) {
      if (!wanted || disposed) exit();
    } else {
      const userExited = wanted;
      owned = wanted = false;
      if (userExited && !disposed) onExit();
    }
  }
  doc.addEventListener('fullscreenchange', changed);
  return {
    enter() {
      if (disposed) return;
      wanted = true;
      if (doc.fullscreenElement || pending || doc.fullscreenEnabled === false || !page?.requestFullscreen) return;
      owned = pending = true;
      try {
        // Called in the same click as requestPointerLock, immediately AFTER it:
        // fullscreen consumes transient activation, while pointer lock needs it.
        Promise.resolve(page.requestFullscreen()).then(() => {
          pending = false;
          if (!wanted || disposed) exit();
          else changed();
        }, () => { owned = pending = wanted = false; });
      } catch { owned = pending = wanted = false; }
    },
    exit,
    dispose() {
      disposed = true;
      exit();
      doc.removeEventListener('fullscreenchange', changed);
    },
  };
}
