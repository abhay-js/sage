const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),ts=require('typescript');
function load(file,dependencies={}){const box={exports:{},require:name=>dependencies[name],Date,Map};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,box);return box.exports;}
const product=load('lib/productConfig.ts'),ui=load('lib/challengeExperience.ts',{'./productConfig':product});
const now=Date.now(),base={id:'complete',status:'closed',joined:false,participant_count:4,challenge_start:new Date(now-10*86400000).toISOString(),challenge_end:new Date(now-86400000).toISOString()};
assert.equal(ui.preferredChallenge([{...base,id:'empty',participant_count:0},base]).id,'complete');
const live={...base,id:'live',status:'open',challenge_end:new Date(now+86400000).toISOString()};assert.equal(ui.preferredChallenge([base,live]).id,'live');
assert.equal(ui.preferredChallenge([{...base,status:'draft'}]),undefined);
const timing=ui.challengeTiming({...live,challenge_start:new Date(now).toISOString(),challenge_end:new Date(now+7*86400000).toISOString()},now);assert.equal(timing.day,1);assert.equal(timing.days,7);assert.equal(timing.label,'Day 1 / 7');
assert.equal(ui.challengeTiming(base,now).label,'Challenge complete');
assert.equal(ui.relativePoints(20,20),'Level on points');assert.equal(ui.relativePoints(30,20),'10 pts ahead');assert.equal(ui.relativePoints(10,20),'10 pts behind');assert.equal(ui.relativePoints(10,null),'10 pts');
assert.equal(ui.formatDuration(3661),'01:01:01');assert.equal(ui.formatDuration(-2),'00:00:00');
const a={id:'a',rank:1},b={id:'b',rank:24};assert.equal(ui.mountainRows([a],[b,a]).length,2);assert.equal(ui.mountainRows([a],[b,a])[1].rank,24);
assert.equal(ui.sportLabel('WeightTraining'),'Strength');assert.equal(ui.sportLabel('CrossFit'),'HYROX');
console.log('PASS: live/completed/default challenge selection, day boundaries, accurate ahead/behind/tie gaps, long timers and unique ordered mountain athletes.');
