import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {offerFor,editorialAnswer,secureLink,selectionDocument} from '../js/museum/experience-model.js';
test('unpublished offers cannot expose checkout and unsafe external links are dropped',()=>{
 const work={id:'a'};
 assert.equal(offerFor(work,{offers:{a:{published:false,checkout:'https://buy.stripe.com/demo'}}}),null);
 const o=offerFor(work,{offers:{a:{published:true,checkout:'https://buy.stripe.com.attacker.test/demo',nft:'javascript:alert(1)'}}});
 assert.equal(o.checkout,null);assert.equal(o.nft,null);
 assert.equal(secureLink('https://user:secret@buy.stripe.com/x',['buy.stripe.com']),null);
 assert.equal(secureLink('https://gallery.manifold.xyz/edition',['manifold.xyz']),'https://gallery.manifold.xyz/edition');
});
test('editorial guide acknowledges missing facts rather than making up production details',()=>{
 assert.match(editorialAnswer('Come è stata realizzata?',{medium:'Fotografia digitale'}),/non contiene/);
 assert.match(editorialAnswer('Quale obiettivo?',{}),/non contiene/);
 assert.equal(editorialAnswer('Raccontami il ritratto',{description:'Testo autore.'}),'Testo autore.');
 const doc=selectionDocument([{id:'a',title:'Opera',credit:'Autore',privateField:'never'}]);
 assert.equal(doc.works[0].privateField,undefined);
});
test('Studio and AR stay outside the initial gallery payload',async()=>{
 const meta=JSON.parse(await readFile('build-meta.json','utf8')),report=JSON.parse(await readFile('build-report.json','utf8'));
 for(const file of report.initial){assert.ok(!Object.keys(meta.outputs[file].inputs).some(p=>p.includes('ar-runtime')||p.endsWith('collector-studio.js')));}
});
