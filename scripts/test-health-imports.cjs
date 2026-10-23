const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,requireFn=()=>{throw Error('Unexpected dependency');}){const sandbox={exports:{},require:requireFn,setTimeout,clearTimeout,console};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,sandbox);return sandbox.exports;}
const m=load('lib/healthWorkouts.ts'),threshold=load('lib/thresholdScoring.ts');
const start='2026-10-09T06:00:00Z',end='2026-10-09T07:00:00Z';
const original={id:'garmin-ride',sourceId:'com.garmin.connect',sourceName:'Garmin Connect',activityId:13,start,end,metadata:{HKIndoorWorkout:1},distance:0,calories:450,duration:3300};
const missing=m.iosWorkout('athlete',original);assert.equal(missing.distance_meters,null);assert.equal(missing.indoor,true);assert.equal(missing.moving_time_secs,3300);assert.equal(missing.elapsed_time_secs,3600);
const cfg={scoringRules:[{sport:'Ride',unit:'KM',threshold:20,points:10}]};assert.equal(threshold.thresholdPoints(cfg,'Ride',missing.distance_meters,missing.moving_time_secs),0);
assert.equal(threshold.thresholdPoints({scoringRules:[{sport:'Ride',unit:'MINUTES',threshold:30,points:10}]},'Ride',null,3300),10);
const complete=m.iosWorkout('athlete',{...original,distance:20});assert(Math.abs(complete.distance_meters-32186.88)<0.01);assert.equal(threshold.thresholdPoints(cfg,'Ride',complete.distance_meters,3300),10);
// Watch-created Health workouts use the same account-scoped import path.
const watch=m.iosWorkout('athlete',{...original,id:'8FD6BAE7-1DA5-42A5-B937-6BC9864C81E8',sourceId:'com.abhayjain.sage.dev.f6afk24zxk.watchkitapp',sourceName:'Sage',activityId:37,distance:3.106855961,duration:1800,metadata:{HKIndoorWorkout:0}});
assert.equal(watch.sport_type,'Run');assert.equal(watch.activity_name,'Sage · Run');assert.equal(watch.indoor,false);assert.equal(watch.moving_time_secs,1800);assert(Math.abs(watch.distance_meters-5000)<0.01);assert.equal(watch.strava_activity_id,'health_ios_athlete_8FD6BAE7-1DA5-42A5-B937-6BC9864C81E8');
assert.equal(m.iosWorkout('a',{...original,tracked:false}),null);assert.equal(m.iosWorkout('a',{...original,end:'invalid'}),null);
assert.equal(m.androidSports[9],'Ride');assert.equal(m.androidSports[56],'Run');assert.equal(m.iosSports[35],'Rowing');
const summary=m.heartSummary([{startDate:start,value:130,sourceId:'garmin'},{startDate:start,value:200,sourceId:'another-app'},{startDate:start,value:NaN,sourceId:'garmin'}],start,end,'garmin');assert.equal(summary.avg_heartrate,130);
assert.equal(m.intervalTotal([{startTime:start,endTime:end,distance:{inMeters:25000}},{startTime:'2026-10-09T00:00:00Z',endTime:'2026-10-09T23:59:59Z',distance:{inMeters:40000}}],start,end,r=>r.distance.inMeters),25000);
const now=Date.parse('2026-10-12T06:00:00Z');assert.equal((now-m.healthReadSince(null,'android',now).getTime())/86400000,30);assert.equal((now-m.healthReadSince(new Date(now),'ios',now).getTime())/86400000,7);
let platform='ios',account='athlete',permission=true,reads=0;const stored=new Map();
const supabase={auth:{getUser:async()=>({data:{user:{id:account}}})},from:()=>({select:()=>({eq:()=>({in:async(_,ids)=>({data:ids.filter(id=>stored.has(id)).map(strava_activity_id=>({strava_activity_id}))})})}),upsert:async(rows)=>{rows.forEach(r=>stored.set(r.strava_activity_id,r));return{error:null};}})};
const HK={Constants:{Permissions:{}},initHealthKit:(_,cb)=>cb(null),getSamples:(_,cb)=>cb(null,[original]),getHeartRateSamples:()=>{throw Error('Garmin must not read all-day HR');}};
const session={exerciseType:9,title:'Indoor ride',startTime:start,endTime:end,metadata:{id:'hc-ride',dataOrigin:'com.garmin.android.apps.connectmobile'}};
const HC={initialize:async()=>true,requestPermission:async p=>permission?p:[],getGrantedPermissions:async()=>[{accessType:'read',recordType:'ExerciseSession'},{accessType:'read',recordType:'Distance'},{accessType:'read',recordType:'HeartRate'}],readRecords:async(type,opts)=>{reads++;if(type==='ExerciseSession')return{records:[session]};assert.equal(opts.dataOriginFilter[0],session.metadata.dataOrigin);return{records:type==='Distance'?[{startTime:start,endTime:end,distance:{inMeters:30000}}]:type==='HeartRate'?[{samples:[{time:start,beatsPerMinute:145}]}]:[]};}};
const adapter=load('lib/healthSync.ts',name=>name==='react-native'?{Platform:{get OS(){return platform}}}:name==='./supabase'?{supabase}:name==='./healthWorkouts'?m:name==='react-native-health'?HK:name==='react-native-health-connect'?HC:assert.fail(name));
(async()=>{
  assert.equal(await adapter.syncHealthPlatform('athlete',null),1);assert.equal(await adapter.syncHealthPlatform('athlete',null),0);assert.equal(stored.size,1);assert.equal([...stored.values()][0].avg_heartrate,null);
  await assert.rejects(adapter.syncHealthPlatform('wrong-owner',null),/account changed/);await assert.rejects(adapter.syncHealthPlatform('athlete',null,{shouldContinue:()=>false}),/stopped/);
  platform='android';permission=false;await assert.rejects(adapter.syncHealthPlatform('athlete',null),/Allow Sage/);permission=true;
  assert.equal(await adapter.syncHealthPlatform('athlete',null,{requestPermissions:false}),1);const row=[...stored.values()].find(r=>r.strava_activity_id.startsWith('health_android'));assert.equal(row.distance_meters,30000);assert.equal(row.avg_heartrate,145);assert.equal(row.calories,null);assert.equal(row.sport_type,'Ride');assert.equal(row.indoor,true);
  assert.equal(await adapter.syncHealthPlatform('athlete',null),0);
  let page=0;const paged={readRecords:async()=>({records:[++page],pageToken:page<3?'p'+page:undefined})};assert.equal((await adapter.readAndroidPages(paged,'ExerciseSession',{})).length,3);
  await assert.rejects(adapter.readAndroidPages({readRecords:async()=>({records:[],pageToken:'same'})},'ExerciseSession',{}),/too much data/);
  platform='web';await assert.rejects(adapter.syncHealthPlatform('athlete',null),/native Sage app/);
  console.log('PASS: Garmin missing-distance scoring, duration and units, source-specific metrics, indoor Android types, denied permissions, paginated reads, retry deduplication, account changes and stopped imports.');
})().catch(e=>{console.error(e);process.exitCode=1;});
