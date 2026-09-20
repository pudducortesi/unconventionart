import { prepareVendor } from "./vendor.mjs";
import { cp, mkdir, rm } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const path of [
  "index.html",
  "editorial.html",
  "exhibitions.html",
  "collection.html",
  "about.html",
  "contact.html",
  "journal.html",
  "post.html",
  "css",
  "js",
  "data",
  "images",
]) {
  await cp(path, `dist/${path}`, {
    recursive: true,
    filter: (src) =>
      !src.includes("private") && !src.endsWith("local-catalogue.json"),
  });
}
console.log("Static website built in dist/. Private preview assets excluded.");

await prepareVendor("dist");
