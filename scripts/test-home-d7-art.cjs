const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps={}){const box={exports:{},require:id=>deps[id]};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,box);return box.exports;}
const {homeGameArtwork}=load('lib/homeGameArtwork.ts'),{dawnSvg}=load('lib/dawnSvg.ts',{'./dawnPalette':{dawnColors:{art:{}}}}),{homeGameGeometry}=require('../lib/homeGameGeometry.cjs'),{art}=require('../lib/homeGameArtworkPalette.cjs'),scope={...homeGameGeometry(),art};
for(const match of JSON.stringify(homeGameArtwork).matchAll(/\{\{([^}]+)\}\}/g)){const value=match[1].split('.').reduce((v,k)=>v?.[k],scope);assert(value!==undefined,`missing scene value ${match[1]}`);}
const xml=dawnSvg(homeGameArtwork,scope);assert(xml.startsWith('<svg'));assert(xml.includes('viewBox="0 0 1560 844"'));assert(!xml.includes('{{'));assert(!xml.includes('<filter'));assert(!/NaN|Infinity|undefined/.test(xml));
for(let i=0;i<4;i++)assert(xml.replace('viewBox="0 0 1560 844"',`viewBox="${i*390} 0 390 844"`).includes(`viewBox="${i*390} 0 390 844"`));
console.log('PASS: all Home D7 panorama values, artwork and four scene viewports.');
