import { prepareVendor } from "./vendor.mjs";
import { cp, mkdir, rm } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
// The production experience has one HTML entry point. Legacy editorial source
// remains in git, but is not shipped as a separate website.
for (const path of [
  "index.html",
  "css/museum.css",
  "js/museum",
  "js/catalogue.js",
  "data/catalogue.json",
  "images/kavyar",
  "images/site/favicon-32.png",
  "images/site/brand-original.svg",
]) {
  await mkdir(`dist/${path.substring(0, path.lastIndexOf("/")) || "."}`, {
    recursive: true,
  });
  await cp(path, `dist/${path}`, { recursive: true });
}
await prepareVendor("dist");
console.log("Single-page gallery built in dist/.");
