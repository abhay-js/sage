const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps={}){const box={exports:{},require:id=>deps[id],Date,Map,Set};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,box);return box.exports;}
const {homeSummits,homeGiants}=load('lib/homeSummits.ts');
const workout=(id,secs,status='approved')=>({id,moving_time_secs:secs,review_status:status});
assert.equal(homeSummits([]).totalMetres,0);
assert.equal(homeSummits([workout('a',3600)]).totalMetres,100);
assert.equal(homeSummits([workout('a',3600),workout('a',3600),workout('bad',36000,'rejected'),workout('pending',36000,'pending'),workout('invalid',NaN),workout('negative',-1)]).totalMetres,100);
const first=homeGiants[0].height;
assert.equal(homeSummits([workout('a',first*36-1)]).completed,0);
const crossed=homeSummits([workout('a',first*36)]);assert.equal(crossed.completed,1);assert.equal(crossed.metres,0);assert.equal(crossed.peak.name,'Gasherbrum II');
const all=homeSummits([workout('a',homeGiants.reduce((sum,p)=>sum+p.height,0)*36+3600)]);assert.equal(all.completed,14);assert.equal(all.progress,1);assert.equal(all.hoursLeft,0);
const identity=load('lib/homeAvatarIdentity.ts',{'./avatarBuilder':load('lib/avatarBuilder.ts',{'./avatarBuilderData':load('lib/avatarBuilderData.ts')}),'./avatarIdentityArtwork':load('lib/avatarIdentityArtwork.ts'),'./dawnSvg':load('lib/dawnSvg.ts',{'./dawnPalette':{dawnColors:{art:{}}}}),'./avatarBuilderGeometry.cjs':require('../lib/avatarBuilderGeometry.cjs'),'./avatarBuilderPalette.cjs':require('../lib/avatarBuilderPalette.cjs')});
const artwork=load('lib/homeAthleteRig.ts'),motion=load('lib/homeAthleteMotion.ts'),{homeRigFrame}=load('lib/homeRigAnimation.ts',{'./homeAvatarIdentity':identity,'./homeAthleteMotion':motion,'./homeAthleteRig':artwork});
for(const mood of ['fired','proud','fresh','restless','sleepy','tired','recovering','celebrating']) {
 for(const t of [0,.1,.5,1,2,10]){const xml=homeRigFrame(mood,t,182);assert(!/NaN|undefined|\{\{|Infinity/.test(xml),`${mood} ${t}: ${xml.match(/.{0,100}(NaN|undefined|Infinity).{0,100}/)?.[0]}`);assert(xml.startsWith('<svg'));}
 assert.notEqual(homeRigFrame(mood,0,182),homeRigFrame(mood,.5,182));
}
const {avatarSide,avatarPro}=require('../lib/wallAthleteGeometry.cjs');
const runner=avatarSide({size:34});assert.equal(runner.h,68);assert.notEqual(runner.a.nearLeg,runner.b.nearLeg);assert.notEqual(runner.a.nearArm,runner.b.nearArm);
for(const pose of ['step','stand','reach']){const athlete=avatarPro({pose,size:40});assert(athlete.head&&athlete.armL&&athlete.legL);}
console.log('PASS: summit boundaries, approved workouts, duplicate protection, all eight articulated moods, and original two-frame finish runners.');

const custom={appearance:{hair:'bun',facial:'full',eyewear:'shades',skin:'t9',topColor:'pink'}};
assert.notEqual(homeRigFrame('sleepy',0,182),homeRigFrame('sleepy',0,182,custom));
assert(!/NaN|undefined|\{\{/.test(homeRigFrame('sleepy',0,182,custom)));
