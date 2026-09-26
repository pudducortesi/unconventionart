import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const entry=JSON.parse(readFileSync(new URL('../research/social-upgrades.json',import.meta.url))).repositories.find(r=>r.repo==='M3-org/CharacterStudio');
execFileSync('git',['submodule','update','--init','--checkout','--depth','1','--',entry.path],{cwd:root,stdio:'inherit'});
const sha=execFileSync('git',['-C',entry.path,'rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
if(sha!==entry.sha)throw Error('Unexpected CharacterStudio source revision');
execFileSync('npm',['ci','--ignore-scripts'],{cwd:new URL('../'+entry.path+'/',import.meta.url),stdio:'inherit'});
