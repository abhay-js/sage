const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),ts=require('typescript');
const cache={};function load(file){file=path.resolve(file);if(!path.extname(file))file+='.ts';if(file.endsWith('.cjs'))return require(file);if(cache[file])return cache[file];const box={exports:{},require:id=>load(path.resolve(path.dirname(file),id)),Date,Map,Set,Math,JSON};cache[file]=box.exports;vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,box);return box.exports;}
const {avatarGeometry}=require('../lib/avatarBuilderGeometry.cjs');
for(const headwear of ['hijab','patka','swimcap'])assert.equal(avatarGeometry({hair:'braids',headwear}).braids,'');
assert(avatarGeometry({hair:'braids',headwear:'none'}).braids);
const b=load('lib/avatarBuilder'),a=load('lib/avatar'),{avatarBuilderSvg}=load('lib/avatarBuilderSvg');
const legacy={skin:'deep',kit:'lilac',gear:'Band',movement:'Ride'};
assert.equal(JSON.stringify(a.normalizeAvatar(legacy)),JSON.stringify(legacy));
const migrated=b.avatarAppearance(legacy);assert.equal(migrated.skin,'t7');assert.equal(migrated.topColor,'purple');assert.equal(migrated.top,'jersey');assert.equal(migrated.shoes,'cycling');
const before=JSON.stringify(migrated),changed=b.surpriseAvatar(migrated,()=>.5);assert.notEqual(JSON.stringify(changed),before);assert.equal(JSON.stringify(migrated),before);
assert.equal(b.avatarFeatures.length,32);assert.equal(Object.values(b.AVATAR_OPTIONS).reduce((n,v)=>n+v.length,0),206);
const grouped=b.AVATAR_GROUPS.flatMap(g=>g[2].map(feature=>feature[0]));assert.equal(new Set(grouped).size,32);assert.equal([...grouped].sort().join(','),[...b.avatarFeatures].sort().join(','));
const invalid=b.normalizeAppearance({skin:'bad',hair:null,top:['hoodie'],level:99});assert.equal(invalid.skin,b.DEFAULT_APPEARANCE.skin);assert.equal(invalid.hair,b.DEFAULT_APPEARANCE.hair);assert.equal(invalid.level,undefined);
const saved=b.withAvatarAppearance(legacy,{...migrated,skin:'t10',topColor:'mint',headwear:'hijab',hair:'braids'});assert.equal(saved.skin,'dark');assert.equal(saved.kit,'forest');assert.equal(saved.gear,'None');assert.equal(saved.movement,'Ride');assert.equal(a.normalizeAvatar(saved).appearance.hair,'braids');
let seed=91;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);let current=changed;
for(let i=0;i<200;i++){const next=b.surpriseAvatar(current,random);assert.notEqual(JSON.stringify(next),JSON.stringify(current));for(const key of b.avatarFeatures)assert(b.AVATAR_OPTIONS[key].includes(next[key]),`${key} must stay valid`);current=next;}
function validSvg(appearance,crop,id){const xml=avatarBuilderSvg(appearance,{crop,id});assert(xml.startsWith('<svg'));assert(xml.includes('viewBox='));assert(!/NaN|Infinity|undefined|\{\{|sc-if|<script/.test(xml));assert(xml.includes(`id="${id}-${appearance.face}"`));assert(xml.includes(`url(#${id}-${appearance.face})`));return xml;}
for(const key of b.avatarFeatures)for(const value of b.AVATAR_OPTIONS[key])for(const crop of ['head','full'])validSvg({...b.DEFAULT_APPEARANCE,[key]:value},crop,'test-'+key+'-'+value);
for(let i=0;i<30;i++)validSvg(b.surpriseAvatar(current,random),'full','mix'+i);
assert.notEqual(validSvg(current,'head','one'),validSvg(current,'head','two'));
assert.equal(b.avatarHeadCategory('extras','headwear'),true);assert.equal(b.avatarHeadCategory('outfit','top'),false);
fs.writeFileSync('/private/tmp/sage-avatar-builder-sample.svg',validSvg({...b.DEFAULT_APPEARANCE,hair:'braids',headwear:'none',top:'teamjersey',topColor:'purple',pose:'wave'},'full','sample'));
console.log('PASS: 32 features / 206 choices, legacy conversion, safe draft randomization, appearance round-trip, all SVG options/crops, mixed outfits and unique clip IDs.');
