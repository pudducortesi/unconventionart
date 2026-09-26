import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const root=new URL('../',import.meta.url);
const entry=JSON.parse(readFileSync(new URL('../research/social-upgrades.json',import.meta.url))).repositories.find(r=>r.repo==='M3-org/CharacterStudio');
const target=new URL('../'+entry.path+'/',import.meta.url);
if(existsSync(new URL('.git',target))){
 const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:target,encoding:'utf8'}).trim();
 if(sha!==entry.sha)throw Error('Unexpected CharacterStudio source revision');
}else{
 const response=await fetch(`https://codeload.github.com/${entry.repo}/tar.gz/${entry.sha}`,{signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw Error('Cannot download pinned CharacterStudio');
 const archive=join(tmpdir(),`ua-characterstudio-${entry.sha}.tar.gz`);writeFileSync(archive,new Uint8Array(await response.arrayBuffer()));mkdirSync(target,{recursive:true});
 try{execFileSync('tar',['-xzf',archive,'--strip-components=1','-C',target.pathname],{stdio:'inherit'});}finally{rmSync(archive,{force:true});}
}
execFileSync('npm',['ci','--ignore-scripts'],{cwd:target,stdio:'inherit'});
