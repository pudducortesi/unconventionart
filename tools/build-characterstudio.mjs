import {execFileSync} from 'node:child_process';
import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
const root=new URL('../research/upstream/CharacterStudio/',import.meta.url);
// Upstream runs as a sandboxed editor. Do not inject deployment secrets into it.
const env={PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'production',VITE_ASSET_PATH:'.'};
execFileSync(process.execPath,[new URL('./characterstudio-vite.mjs',import.meta.url).pathname],{cwd:root,env,stdio:'inherit'});
await mkdir('integrations/characterstudio',{recursive:true});
await cp(new URL('build/',root),'integrations/characterstudio',{recursive:true});
const manifestPath='integrations/characterstudio/manifest.json';
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
for(const entry of manifest.characters||[])if(entry.manifest?.startsWith('./loot-assets/'))entry.manifest=entry.manifest.replace('./loot-assets/','https://m3-org.github.io/loot-assets/');
await writeFile(manifestPath,JSON.stringify(manifest));
await cp(new URL('LICENSE',root),'integrations/characterstudio/LICENSE.txt');

// Opaque-origin sandbox has no browser storage. Keep editor preferences in memory.
const htmlPath='integrations/characterstudio/index.html';
const storageScript=`<script>globalThis.__uaEditorStorage=Object.create(null);Object.defineProperties(globalThis.__uaEditorStorage,{getItem:{value:function(k){return this[k]??null}},setItem:{value:function(k,v){Object.defineProperty(this,k,{value:String(v),enumerable:true,writable:true,configurable:true})}},removeItem:{value:function(k){delete this[k]}},clear:{value:function(){for(const k of Object.keys(this))delete this[k]}}});</script>`;
await writeFile(htmlPath,(await readFile(htmlPath,'utf8')).replace('<head>','<head>'+storageScript));

await writeFile('integrations/characterstudio/status.json',JSON.stringify({available:true}));
