import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
for(const [pkg,name] of [['@pixiv/three-vrm','VRMLoaderPlugin'],['@pmndrs/uikit','Container'],['livekit-client','Room']]){
 const mod=await import(pkg);assert.equal(typeof mod[name],'function');console.log(pkg+': import OK');
}
const mesh=await import('meshoptimizer');await mesh.MeshoptEncoder.ready;assert(mesh.MeshoptEncoder.supported);console.log('meshoptimizer: WASM ready');
const server=createRequire(new URL('../server/multiplayer/package.json',import.meta.url));
execFileSync(process.execPath,['--input-type=module','-e',`import {Room} from ${JSON.stringify(pathToFileURL(server.resolve('colyseus')).href)}; if(typeof Room!=='function')throw Error('Colyseus unavailable');`],{stdio:'pipe'});console.log('colyseus: server import OK');
execFileSync(process.execPath,['node_modules/@gltf-transform/cli/bin/cli.js','--version'],{stdio:'inherit'});
const studio=new URL('../research/upstream/CharacterStudio/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('package.json',studio)));
assert.equal(manifest.name,'@m3-org/characterstudio');
assert.equal(typeof createRequire(new URL('package.json',studio)).resolve('vite'),'string');console.log('CharacterStudio: editor dependencies installed');
