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

// Validate the actual deploy artifact, not only the editable source tree.
const meta = JSON.parse(await readFile('build-meta.json','utf8'));
const report = JSON.parse(await readFile('build-report.json','utf8'));
const deployedHtml = await readFile('dist/index.html','utf8');
for (const [, path] of deployedHtml.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if (!/^(https?:|mailto:|#|data:)/.test(path)) await access(`dist/${path}`);
}
for (const [path, output] of Object.entries(meta.outputs)) {
  await access(path);
  for (const ref of output.imports) {
    assert.equal(!!ref.external,false,`No unresolved production import: ${ref.path}`);
    await access(ref.path);
  }
}
assert(!report.initial.includes(report.photo),'Path tracer stays out of initial loading');
assert(!deployedHtml.includes(report.photo.replace('dist/','')),'Do not preload the path tracer');
for (const path of ['images/site/brand-original.svg'])
  assert((await readFile(path)).equals(await readFile(`dist/${path}`)),`Preserve original asset bytes: ${path}`);
const optimizedCatalogue = JSON.parse(await readFile('dist/data/catalogue.json','utf8'));
assert.equal(optimizedCatalogue.works.length,data.works.length,'Preserve the public work count');
for(const [key,value] of Object.entries(data))if(!['works','hero'].includes(key))assert.deepEqual(optimizedCatalogue[key],value,`Preserve catalogue ${key}`);
for(const [index,work] of data.works.entries()) {
  const published=optimizedCatalogue.works[index];
  for(const [key,value] of Object.entries(work))if(!['image','variants','thumbnail','mobilePreview','preview'].includes(key))assert.deepEqual(published[key],value,`Preserve work ${key}`);
  assert.equal(published.image,published.preview);
  await assert.rejects(access(`dist/${work.image}`), {code:'ENOENT'}, 'Masters must not be public');
  for(const field of ['thumbnail','mobilePreview','preview'])await access(`dist/${published[field]}`);
}
const engineOwners = Object.values(meta.outputs).filter(output => output.inputs?.['vendor/three.core.js']);
assert.equal(engineOwners.length,1,'One shared Three engine across rendering modes');
console.log('Production imports, shared engine and exclusion of master photographs verified.');

const studioSource = await readFile("js/museum/collector-studio.js", "utf8");
for (const [,id] of studioSource.matchAll(/\$\('#([\w-]+)'\)/g)) assert(museumIds.has(id), `Missing Studio element: ${id}`);
