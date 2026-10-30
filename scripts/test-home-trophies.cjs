const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps={}){const box={exports:{},require:id=>deps[id],Date,Map,Set};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,box);return box.exports;}
const log=load('lib/activityLog.ts',{'./productConfig':{}}),{homeTrophies}=load('lib/homeTrophies.ts',{'./activityLog':log});
const activity=(id,date,distance,status='approved',sport='Run')=>({id,activity_date:date,activity_started_at:date+'T10:00:00',distance_meters:distance,review_status:status,sport_type:sport});
const now=new Date(2026,9,28,12),workouts=[activity('a','2026-10-24',25000),activity('b','2026-10-25',25000),activity('c','2026-10-26',25000),activity('d','2026-10-27',25000),activity('bad','2026-10-28',100000,'rejected')];
const race={id:'race',joined:true,status:'closed',rank:1,participant_count:10,sage_score:100},receipt={activity_id:'a',race_id:'race',status:'COUNTED'};
const list=homeTrophies(workouts,[race],[receipt],now),get=id=>list.find(t=>t.id===id);
assert(get('streak3').earned);assert(!get('streak5').earned);assert.equal(get('streak5').detail,'1 day to go');assert(get('km100').earned);assert(get('half').earned);assert(!get('marathon').earned);assert(get('champ').earned);assert(get('top10').earned);
const old=homeTrophies([activity('old1','2025-02-01',50000),activity('old2','2025-02-02',50000)],[],[],now);assert(old.find(t=>t.id==='km100').earned);assert.equal(old.find(t=>t.id==='streak3').detail,'3 days to go');
const bad=homeTrophies([workouts[4]],[race],[{...receipt,activity_id:'bad'}],now);assert(!bad.find(t=>t.id==='clash1').earned);assert(!bad.find(t=>t.id==='champ').earned);assert(!bad.find(t=>t.id==='half').earned);
assert(!homeTrophies(workouts,[{...race,status:'open'}],[receipt],now).find(t=>t.id==='champ').earned);
console.log('PASS: approved-only trophies, current versus historical streaks, historical monthly milestones, closed challenge podiums and rejected receipts.');
