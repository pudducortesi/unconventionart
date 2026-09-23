// Device-independent frame budget. Only navigation frames count;
// loading/tab pauses do not make an idle machine appear slow.
export function createPerformancePolicy() {
  let level = 0, elapsed = 0, samples = 0, fps = null;
  const profiles = [
    { ratio: 1.25, economical: false, label: 'Bilanciata' },
    { ratio: 1, economical: true, label: 'Fluida' },
    { ratio: .85, economical: true, label: 'Fluida essenziale' },
  ];
  return {
    get fps() { return fps; },
    get profile() { return profiles[level]; },
    sample(milliseconds, moving) {
      if (milliseconds > 2000 || milliseconds < 1) {
        elapsed = 0; samples = 0; return false;
      }
      if (!moving) return false;
      elapsed += milliseconds; samples++;
      if (elapsed < 1200 || samples < 8) return false;
      fps = Math.round(samples * 1000 / elapsed);
      const slow = elapsed / samples > 25;
      elapsed = 0; samples = 0;
      // Do not oscillate quality while the visitor is walking. New page visits
      // start balanced again; stationary artwork viewing retains full detail.
      if (!slow || level === profiles.length - 1) return false;
      level++; return true;
    },
  };
}
