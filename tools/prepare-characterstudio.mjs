import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export async function prepareCharacterStudio({run=execFileSync,output='integrations/characterstudio'}={}){
 try{
  run(process.execPath,['tools/setup-characterstudio.mjs'],{stdio:'inherit'});
  run(process.execPath,['tools/build-characterstudio.mjs'],{stdio:'inherit'});
  return true;
 }catch{
  console.warn('CharacterStudio could not be prepared. The gallery remains available; the laboratory links to the original editor.');
  await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
  await writeFile(output+'/status.json',JSON.stringify({available:false}));
  await writeFile(output+'/index.html','<!doctype html><html lang="it"><meta charset="utf-8"><title>Editor avatar</title><h1>Editor locale non disponibile</h1><p>Apri l’editor originale dal Laboratorio avatar.</p></html>');
  return false;
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await prepareCharacterStudio();
