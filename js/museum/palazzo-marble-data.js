// One axial palace-floor bay: 10 m wide, 13 m long. The end cross-bands
// join seamlessly; these are stone colours, not baked reflections or shadows.
const TAU = Math.PI * 2;
const STONE = {
  white: { colour: [224, 224, 215], vein: [-63, -61, -56], roughness: .21 },
  silver: { colour: [170, 177, 170], vein: [-53, -52, -47], roughness: .23 },
  verde: { colour: [43, 62, 52], vein: [91, 99, 86], roughness: .20 },
  rosso: { colour: [133, 81, 69], vein: [70, 75, 66], roughness: .22 },
  giallo: { colour: [182, 151, 98], vein: [-44, -38, -26], roughness: .21 },
  cream: { colour: [230, 219, 186], vein: [-47, -42, -29], roughness: .19 }
};
const stones = Object.values(STONE);

function floorStone(x, z) {
  const ax = Math.abs(x), az = Math.abs(z);
  // Continuous white transverse bands frame the full width of each bay.
  if (az > 5.37) return ax > 4.83 ? 1 : 0;
  if (ax > 4.83) return 1;
  if (ax > 4.76) return 0;
  if (ax > 4.30) return 1;
  if (ax > 4.23) return 0;
  if (ax > 4.15) return 2;
  if (ax > 3.70) return 0;
  if (ax > 3.49 || az > 5.16) return 2;
  if (ax > 3.44 || az > 5.11) return 4;
  const oval = Math.hypot(x / 2.61, z / 3.96);
  if (oval > 1.025) return 3;
  if (oval > 1.006) return 2;
  if (oval > .975) return 4;
  if (oval > .944) return 5;
  if (oval > .932) return 4;
  return 5;
}

function hash(x, y, seed) {
  let n = Math.imul(x + seed, 374761393) ^ Math.imul(y + 1, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function noiseGrid(columns, rows, seed) {
  const grid = new Float32Array((columns + 1) * rows);
  for (let y = 0; y < rows; y++) for (let x = 0; x <= columns; x++) {
    grid[y * (columns + 1) + x] = hash(x, y, seed) * 2 - 1;
  }
  return (u, v) => {
    const px = u * columns, py = v * rows;
    const ix = Math.min(columns - 1, Math.floor(px)), iy = Math.floor(py);
    const fx = px - ix, fy = py - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = (iy % rows) * (columns + 1) + ix;
    const b = ((iy + 1) % rows) * (columns + 1) + ix;
    return (grid[a] + (grid[a + 1] - grid[a]) * sx) * (1 - sy)
      + (grid[b] + (grid[b + 1] - grid[b]) * sx) * sy;
  };
}

export function createPalazzoMarbleData() {
  const size = 1024, count = size * size;
  const colour = new Uint8Array(count * 4), normal = new Uint8Array(count * 4);
  const roughness = new Uint8Array(count * 4), height = new Float32Array(count);
  const material = new Uint8Array(count);
  const cloudNoise = noiseGrid(7, 6, 31), bodyNoise = noiseGrid(23, 18, 73);
  const detailNoise = noiseGrid(89, 76, 157);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / (size - 1), v = y / (size - 1);
    const stoneId = floorStone((u - .5) * 10, (v - .5) * 13);
    const stone = stones[stoneId], pixel = y * size + x, i = pixel * 4;
    material[pixel] = stoneId;
    const cloud = cloudNoise(u, v), body = bodyNoise(u, v), detail = detailNoise(u, v);
    // Warped veins have broad mineral clouds, fine threads and discontinuous
    // branches. Every y term is periodic over a bay, including the noise grids.
    const phase = TAU * (u * (8 + stoneId * .21) + v * 5) + cloud * 8 + body * 1.7 + stoneId;
    const thread = Math.max(0, 1 - Math.abs(Math.sin(phase)) * (10 + detail * 3));
    const branch = Math.max(0, 1 - Math.abs(Math.sin(phase * 2 - TAU * v * 3 + detail * .8)) * 18);
    const vein = thread * thread * (.62 + body * .22) + branch * .23;
    const mineral = cloud * 11 + body * 7 + detail * 2;
    for (let c = 0; c < 3; c++) {
      colour[i + c] = Math.round(stone.colour[c] + mineral + stone.vein[c] * vein);
    }
    colour[i + 3] = 255;
    height[pixel] = body * .000020 + detail * .000008;
    const finish = stone.roughness + cloud * .018 + body * .008 + vein * .014;
    roughness[i] = roughness[i + 1] = roughness[i + 2] = Math.round(finish * 255);
    roughness[i + 3] = 255;
  }
  // Hairline stone joints affect the surface, without outlining every colour
  // vein or turning polished marble into a corrugated/embossed material.
  for (let y = 0; y < size; y++) for (let x = 1; x < size - 1; x++) {
    const pixel = y * size + x, above = ((y + size - 1) % size) * size + x;
    if (material[pixel] !== material[pixel - 1] || material[pixel] !== material[above]) {
      height[pixel] -= .00010;
      for (let c = 0; c < 3; c++) colour[pixel * 4 + c] *= .94;
    }
  }
  const sample = (x, y) => height[((y + size) % size) * size + Math.max(0, Math.min(size - 1, x))];
  const spacingX = 10 / (size - 1), spacingZ = 13 / (size - 1);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (sample(x - 1, y) - sample(x + 1, y)) / (2 * spacingX);
    const ny = (sample(x, y - 1) - sample(x, y + 1)) / (2 * spacingZ);
    const length = Math.hypot(nx, ny, 1), i = (y * size + x) * 4;
    normal[i] = Math.round((nx / length * .5 + .5) * 255);
    normal[i + 1] = Math.round((ny / length * .5 + .5) * 255);
    normal[i + 2] = Math.round((1 / length * .5 + .5) * 255);
    normal[i + 3] = 255;
  }
  return { size, colour, normal, roughness };
}
