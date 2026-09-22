// Cover an architectural surface without stretching the source or sampling its
// added matte. Region coordinates use image pixels, measured from the top left.
export function coverRegion(width, height, surfaceAspect, region = [0, 0, width, height]) {
  let [x, y, w, h] = region;
  if (w / h > surfaceAspect) {
    const fitted = h * surfaceAspect; x += (w - fitted) / 2; w = fitted;
  } else {
    const fitted = w / surfaceAspect; y += (h - fitted) / 2; h = fitted;
  }
  return { u: x / width, v: 1 - (y + h) / height, width: w / width, height: h / height };
}

export function mapCover(geometry, width, height, surfaceAspect, region) {
  const crop = coverRegion(width, height, surfaceAspect, region);
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, crop.u + uv.getX(i) * crop.width, crop.v + uv.getY(i) * crop.height);
  uv.needsUpdate = true;
  return geometry;
}
