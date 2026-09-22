import { optimizePhotos } from './optimize-photos.mjs';
import { buildARModel } from './build-ar-model.mjs';
import { prepareVendor } from './vendor.mjs';
import { build } from 'esbuild';
import { cp, mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { validatePublishingConfig } from '../js/publishing.js';
const publishing = validatePublishingConfig(JSON.parse(await readFile('data/publishing.json','utf8')));
await rm('dist', { recursive:true, force:true });
await mkdir('dist', { recursive:true });
await prepareVendor();
await buildARModel();
// Publish display derivatives only. Masters stay outside the deployment.
for (const path of ['data/experience.json','data/publishing.json','models/kavyar-01.glb','images/site/favicon-32.png','images/site/brand-original.svg','images/palazzo/colonna-ceiling.webp','images/palazzo/masters','images/palazzo/vaults','corridor-credits.html']) {
  await mkdir(`dist/${path.substring(0,path.lastIndexOf('/'))}`, {recursive:true});
  await cp(path,`dist/${path}`,{recursive:true});
}
const optimized = await optimizePhotos(JSON.parse(await readFile('data/catalogue.json','utf8')));
await writeFile('dist/data/catalogue.json',JSON.stringify(optimized.catalogue,null,2));
await writeFile('photo-optimization-report.json',JSON.stringify(optimized.report,null,2));
const result = await build({
  entryPoints:['js/museum/main.js','css/museum.css','js/admin.js','css/admin.css'],
  outdir:'dist/assets', outbase:'.', entryNames:'[name]-[hash]', chunkNames:'chunk-[hash]',
  bundle:true, splitting:true, format:'esm', minify:true, target:'es2022',
  metafile:true, legalComments:'linked',
});
const outputs = result.metafile.outputs;
const outputFor = entry => Object.keys(outputs).find(key => outputs[key].entryPoint===entry);
const main = outputFor('js/museum/main.js'), css = outputFor('css/museum.css');
const effects = outputFor('vendor/gallery-effects.js');
const photo = outputFor('vendor/gallery-photo-render.js');
if (!main || !css || !effects || !photo) throw new Error('A required gallery component is missing from the build');
const initial = new Set();
function collect(path) {
  if (initial.has(path)) return;
  initial.add(path);
  for (const ref of outputs[path].imports) if (ref.kind !== 'dynamic-import' && !ref.external) collect(ref.path);
}
collect(main); collect(effects);
if (initial.has(photo)) throw new Error('Path tracing must remain on demand');
const url = path => path.replace(/^dist\//,'');
let html = await readFile('index.html','utf8');
html = html.replaceAll('images/kavyar/01.jpg', optimized.catalogue.hero);
html = html.replace('src="js/museum/main.js"',`src="${url(main)}"`).replace('href="css/museum.css"',`href="${url(css)}"`);
// Fetch the exact same rendering features in parallel, without changing first-frame quality.
const preloads = [...initial].filter(path=>path!==main).map(path=>`<link rel="modulepreload" href="${url(path)}">`).join('\n    ');
html = html.replace('</head>',`    ${preloads}\n  </head>`);
await writeFile('dist/index.html',html);
const admin = (await readFile('admin.html','utf8')).replace('src="js/admin.js"',`src="${url(outputFor('js/admin.js'))}"`).replace('href="css/admin.css"',`href="${url(outputFor('css/admin.css'))}"`);
await writeFile('dist/admin.html',admin);
// Once the private archive is activated, old static photographs and AR models
// must not bypass a withdrawal from the live catalogue.
if (publishing.enabled && publishing.liveCatalogue !== false) {
  await rm('dist/images/optimized',{recursive:true,force:true});
  await rm('dist/models',{recursive:true,force:true});
  await writeFile('dist/data/catalogue.json', JSON.stringify({works:[],collections:[]}));
  await writeFile('dist/data/experience.json', JSON.stringify({...JSON.parse(await readFile('data/experience.json','utf8')),offers:{},arModels:{}}));
  await writeFile('dist/index.html',html.replace(/<figure>[\s\S]*?<\/figure>/g,''));
}
await mkdir('dist/licenses',{recursive:true});
await cp('ar-runtime/node_modules/@google/model-viewer/LICENSE','dist/licenses/model-viewer-LICENSE.txt');
await cp('ar-runtime/node_modules/three/LICENSE','dist/licenses/AR-THREE-LICENSE.txt');
for (const name of await readdir('vendor')) if (name.endsWith('LICENSE.txt')) await cp(`vendor/${name}`,`dist/licenses/${name}`);
let bytes=0,gzip=0;
for(const path of initial) {const buffer=await readFile(path);bytes+=buffer.length;gzip+=gzipSync(buffer).length;}
await writeFile('build-meta.json',JSON.stringify(result.metafile,null,2));
await writeFile('build-report.json',JSON.stringify({initialJsBytes:bytes,initialJsGzipBytes:gzip,initialJsFiles:initial.size,initial:[...initial],photo,main,css},null,2));
console.log(`Gallery built: ${initial.size} initial JS files, ${bytes} bytes (${gzip} gzip estimate); path tracing on demand.`);
