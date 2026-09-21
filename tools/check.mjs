import assert from "node:assert/strict";
import { readFile, access, readdir } from "node:fs/promises";
const pages = (await readdir(".")).filter((path) => path.endsWith(".html"));
for (const file of pages) {
  const html = await readFile(file, "utf8");
  assert.match(html, /<html lang="it"/, file);
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${file}: one h1`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, `${file}: unique IDs`);
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|#|data:)/.test(url)) continue;
    await access(url.split(/[?#]/)[0]);
  }
}
const data = JSON.parse(await readFile("data/catalogue.json", "utf8"));
assert.equal(
  new Set(data.works.map((w) => w.id)).size,
  data.works.length,
  "Unique work identifiers",
);
for (const work of data.works) {
  assert(
    data.collections.some((c) => c.id === work.collection),
    "Known collection",
  );
  await access(work.image);
  for (const image of work.variants || []) await access(image);
}
await access(data.hero);
for (const collection of data.collections)
  assert(
    data.works.some((w) => w.collection === collection.id),
    "Collections are not empty",
  );
try {
  await access("dist/data/local-catalogue.json");
  assert.fail("Private catalogue leaked into production build");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
try {
  await access("dist/images/private");
  assert.fail("Private images leaked into production build");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
console.log(
  `${pages.length} pages checked: local links, headings, IDs, catalogue references, production asset isolation.`,
);

const museum = await readFile("index.html", "utf8");
const controller = await readFile("js/museum/main.js", "utf8");
const museumIds = new Set(
  [...museum.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]),
);
for (const [, id] of controller.matchAll(/\$\("#([\w-]+)"\)/g))
  assert(museumIds.has(id), `Controller references missing element: ${id}`);
assert(
  !/href="[^"#]*\.html/.test(museum),
  "The gallery must not link to other pages",
);
assert.deepEqual(
  (await readdir("dist")).filter((path) => path.endsWith(".html")),
  ["index.html"],
  "One production page",
);
console.log("Gallery controller elements and single-page build checked.");
