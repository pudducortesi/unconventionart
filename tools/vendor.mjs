import { mkdir, copyFile } from "node:fs/promises";
export async function prepareVendor(root = ".") {
  await mkdir(`${root}/vendor`, { recursive: true });
  for (const name of ["three.module.js", "three.core.js"])
    await copyFile(
      `node_modules/three/build/${name}`,
      `${root}/vendor/${name}`,
    );
  await copyFile(
    "node_modules/three/LICENSE",
    `${root}/vendor/THREE-LICENSE.txt`,
  );
}
if (process.argv[1]?.endsWith("vendor.mjs")) await prepareVendor();
