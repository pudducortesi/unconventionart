// A seamless 3 x 3 m mosaic: 37.5 cm squares, four strips per square.
// Adjacent squares rotate 90 degrees, as in the gallery reference photograph.
// Colour remains independent of surface height and roughness (both linear data).
export function createParquetData() {
  const size = 512, count = size * size;
  const colour = new Uint8Array(count * 4), normal = new Uint8Array(count * 4);
  const roughness = new Uint8Array(count * 4), height = new Float32Array(count);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const column = Math.floor(x / 64), row = Math.floor(y / 64);
    const rotated = (column + row) % 2;
    const u = rotated ? y % 64 : x % 64;
    const along = rotated ? x % 64 : y % 64;
    const across = u % 16, strip = Math.floor(u / 16);
    const seed = column * 37.1 + row * 19.7 + strip * 13.3;
    const board = Math.sin(seed + 1.7) * 12 + Math.sin(column * 9 + row * 7) * 5;
    const wave = Math.sin(along * .052 + seed) * 1.6 + Math.sin(along * .12 + seed * .3) * .45;
    const rings = across * .76 + wave + seed;
    const grain = Math.sin(rings) * 3.8 + Math.sin(rings * 2.7) * 1.8;
    const pore = Math.sin(across * 41.3 + along * 17.7 + seed) * 1.3;
    const joint = across === 0 || along === 0;
    const bevel = across === 1 || across === 15 || along === 1 || along === 63;
    const variation = board + grain + pore;
    const edge = joint ? .76 : bevel ? .96 : 1;
    const pixel = y * size + x, index = pixel * 4;
    colour[index] = Math.round((160 + variation) * edge);
    colour[index + 1] = Math.round((119 + variation * .82) * edge);
    colour[index + 2] = Math.round((77 + variation * .61) * edge);
    colour[index + 3] = 255;
    height[pixel] = joint ? -.00045 : (bevel ? -.00010 : 0) + grain * .000010;
    const finish = joint ? .72 : bevel ? .57 : .52 + board * .002 + grain * .004;
    roughness[index] = roughness[index + 1] = roughness[index + 2] = Math.round(finish * 255);
    roughness[index + 3] = 255;
  }
  const spacing = 3 / size;
  const at = (x, y) => height[((y + size) % size) * size + (x + size) % size];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (at(x - 1, y) - at(x + 1, y)) / (2 * spacing);
    const ny = (at(x, y - 1) - at(x, y + 1)) / (2 * spacing);
    const length = Math.hypot(nx, ny, 1), index = (y * size + x) * 4;
    normal[index] = Math.round((nx / length * .5 + .5) * 255);
    normal[index + 1] = Math.round((ny / length * .5 + .5) * 255);
    normal[index + 2] = Math.round((1 / length * .5 + .5) * 255);
    normal[index + 3] = 255;
  }
  return { size, colour, normal, roughness };
}
