// A seamless 3 x 3 m module: 16 staggered 18.75 cm boards, 1.5 m long.
// Colour remains independent of surface height and roughness (both linear data).
export function createParquetData() {
  const size = 512, count = size * size;
  const colour = new Uint8Array(count * 4), normal = new Uint8Array(count * 4);
  const roughness = new Uint8Array(count * 4), height = new Float32Array(count);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const row = Math.floor(x / 32), across = x % 32;
    const along = (y + (row % 2) * 128) % 256;
    const segment = Math.floor(((y + (row % 2) * 128) % 512) / 256);
    const board = Math.sin(row * 37.1 + segment * 19.7) * 6;
    const wave = Math.sin(y * Math.PI / 256 + row) * 1.4;
    const grain = Math.sin(across * 2.3 + wave) * 2.3 + Math.sin(across * .65 + wave) * 3;
    const pore = Math.sin(x * 41.3 + y * 17.7) * 1.2;
    const joint = across === 0 || along === 0;
    const bevel = across === 1 || across === 31 || along === 1 || along === 255;
    const variation = board + grain + pore - (bevel ? 5 : 0);
    const pixel = y * size + x, index = pixel * 4;
    colour[index] = joint ? 32 : 85 + variation;
    colour[index + 1] = joint ? 16 : 42 + variation * .62;
    colour[index + 2] = joint ? 12 : 28 + variation * .4;
    colour[index + 3] = 255;
    height[pixel] = joint ? -.00065 : (bevel ? -.00018 : 0) + grain * .000012;
    const finish = joint ? .84 : bevel ? .57 : .46 + board * .007 + grain * .008;
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
