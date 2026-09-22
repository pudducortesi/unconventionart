// Limit actual render-target pixels, not only devicePixelRatio. A 4K monitor
// should not silently allocate several full-resolution postprocessing buffers.
export function selectPixelRatios({ width, height, pixelRatio = 1, mobile = false,
  mode = 'auto', profile, maxTextureSize = Infinity }) {
  const w = Math.max(1, width), h = Math.max(1, height), area = w * h;
  const fluid = mode === 'fluid', economical = fluid || profile.economical;
  const motionBudget = mobile ? (economical ? 800_000 : 1_200_000) : (economical ? 1_400_000 : 2_100_000);
  const detailBudget = mode === 'detail' ? (mobile ? 3_000_000 : 8_300_000)
    : mobile ? (economical ? 1_400_000 : 2_000_000) : (economical ? 2_400_000 : 4_000_000);
  const cap = (ratio, budget) => Math.min(pixelRatio, ratio, Math.sqrt(budget / area),
    maxTextureSize / Math.max(w, h));
  const motion = cap(fluid ? .85 : Math.min(profile.ratio, mobile ? 1.1 : 1.25), motionBudget);
  const detail = cap(fluid ? 1 : mode === 'detail' ? 2 : economical ? 1.25 : 2, detailBudget);
  return { motion, detail };
}
