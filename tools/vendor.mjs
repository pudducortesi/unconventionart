import { build } from "esbuild";
import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
export async function prepareVendor(root = ".") {
  await mkdir(`${root}/vendor`, { recursive: true });
  for (const name of ["three.module.js", "three.core.js"])
    await copyFile(
      `node_modules/three/build/${name}`,
      `${root}/vendor/${name}`,
    );
  const room = await readFile('node_modules/three/examples/jsm/environments/RoomEnvironment.js', 'utf8');
  await writeFile(`${root}/vendor/RoomEnvironment.js`, room.replace("from 'three'", "from './three.module.js'"));
  for (const [entry, output] of [['effects-runtime', 'gallery-effects'], ['photo-render-runtime', 'gallery-photo-render']])
  await build({ entryPoints: [`js/museum/${entry}.js`], outfile: `${root}/vendor/${output}.js`,
    bundle: true, format: 'esm', minify: true, target: 'es2022',
    plugins: [{ name: 'shared-three', setup(builder) {
      builder.onResolve({ filter: /^three$/ }, () => ({ path: './three.module.js', external: true }));
    }}], legalComments: 'linked' });
  for (const [pkg, file] of [['n8ao','LICENSE'], ['postprocessing','LICENSE.md'], ['three-gpu-pathtracer','LICENSE'], ['three-mesh-bvh','LICENSE']])
    await copyFile(`node_modules/${pkg}/${file}`, `${root}/vendor/${pkg}-LICENSE.txt`);
  await copyFile(
    "node_modules/three/LICENSE",
    `${root}/vendor/THREE-LICENSE.txt`,
  );
}
if (process.argv[1]?.endsWith("vendor.mjs")) await prepareVendor();
