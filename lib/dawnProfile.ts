import type { AthleteProfile, AthleteSport } from '../types/product';
import { storyAge } from './athleteStory';
import { dawnColors } from './dawnPalette';
export const DAWN_SPORTS = [
  {id:'run',label:'Running',profile:'RUN'}, {id:'hyrox',label:'HYROX',profile:'HYROX'},
  {id:'tri',label:'Triathlon',profile:'TRIATHLON'}, {id:'swim',label:'Swimming',profile:'SWIM'},
  {id:'ride',label:'Cycling',profile:'RIDE'}, {id:'lift',label:'Strength',profile:'STRENGTH'},
  {id:'other',label:'Another sport',profile:'OTHER'},
] as const;
export type DawnSport = typeof DAWN_SPORTS[number]['id'];
export const RUN_RACES = [['none','None yet'],['5k','5K'],['10k','10K'],['half','Half'],['marathon','Marathon'],['ultra','Ultra']] as const;
export const HYROX_DIVISIONS = [['open','Singles Open'],['pro','Singles Pro'],['doubles','Doubles'],['relay','Relay']] as const;
export const TRI_DISTANCES = [['sprint','Sprint'],['olympic','Olympic'],['half70','Half Ironman'],['full','Ironman']] as const;
export const SWIM_DISTANCES = [['500','500 m'],['1k','1 km'],['2k','2 km'],['4k','4 km+']] as const;
export const SWIM_PACES = [['<15','< 15'],['15-20','15–20'],['20-25','20–25'],['25-30','25–30'],['30+','30+']] as const;
export const TRACKERS = [['apple','Apple Watch'],['garmin','Garmin'],['coros','COROS'],['whoop','WHOOP'],['fitbit','Fitbit'],['phone','Just my phone']] as const;
export const DAWN_CITIES = ['Mumbai','Bengaluru','Delhi','Pune','Hyderabad'];
export const DAWN_PBS = {
  '5k': ['5K',14,45,.5,27,20], '10k':['10K',30,90,.5,56,42], half:['half marathon',70,180,1,125,95],
  marathon:['marathon',150,390,1,255,200], ultra:['ultra',210,600,5,380,330],
  hy_pro:['Singles Pro',55,150,1,85,70], hy_open:['Singles Open',55,150,1,95,75], hy_doubles:['Doubles',50,140,1,85,68], hy_relay:['Relay',45,120,1,75,60],
  sprint:['Sprint',55,150,1,90,75], olympic:['Olympic',115,240,1,170,150], half70:['Half Ironman',240,510,5,360,315], full:['Ironman',540,1020,5,780,660],
} as const;
export type DawnPB = keyof typeof DAWN_PBS;
export interface DawnAnswers {
  version:2; runLongest:string|null; hyCount:number|null; hyDivs:string[]; triDone:string[];
  swimLongest:string|null; swimK:string|null; ftpKnown:'yes'|'no'|null; ftp:number; rideLongest:string|null;
  days:number|null; src:string|null; pb:Partial<Record<DawnPB,number>>; skip:Partial<Record<DawnPB,boolean>>; skippedSports:DawnSport[];
}
export function dawnSteps(sports:DawnSport[]) { return ['gender','age','city','sports',...['run','hyrox','tri','swim','ride'].filter(sport=>sports.includes(sport as DawnSport)),'days','source','done']; }
export function dawnPBKey(step:string,answers:DawnAnswers):DawnPB|undefined {
  if(step==='run'&&answers.runLongest&&answers.runLongest!=='none')return answers.runLongest as DawnPB;
  if(step==='hyrox'&&(answers.hyCount??0)>0){const division=['pro','open','doubles','relay'].find(value=>answers.hyDivs.includes(value));return division?`hy_${division}` as DawnPB:undefined;}
  if(step==='tri')return ['full','half70','olympic','sprint'].find(value=>answers.triDone.includes(value)) as DawnPB|undefined;
}
export function dawnMinutes(value:number) {const seconds=Math.round(value*60),h=Math.floor(seconds/3600),m=Math.floor(seconds/60)%60,s=seconds%60;return h?`${h}:${String(m).padStart(2,'0')} h`:`${m}:${String(s).padStart(2,'0')}`;}
export function dawnAgeGroup(age:number){return age<20?'U20':age>=70?'70+':`${Math.floor(age/5)*5}–${Math.floor(age/5)*5+4}`;}
export function dawnHydrate(source:AthleteProfile):{profile:AthleteProfile;answers:DawnAnswers;sports:DawnSport[]} {
  const profile={...source,age:storyAge(source),gender:source.gender==='Male'?'Man':source.gender==='Female'?'Woman':source.gender==='Other'?'Self-describe':source.gender??'',gender_description:source.gender_description??(source.gender==='Other'?'Other':'')};
  const b=source.benchmarks??{},pb:DawnAnswers['pb']={},skip:DawnAnswers['skip']={};
  const runDistance=b.RUN?.distanceKm,runKey=runDistance===5?'5k':runDistance===10?'10k':runDistance===21.1?'half':runDistance===42.2?'marathon':runDistance!=null&&runDistance>=50?'ultra':null;
  if(runKey&&b.RUN?.timeSeconds)pb[runKey]=b.RUN.timeSeconds/60;
  if(runKey&&b.RUN?.skipped)skip[runKey]=true;
  const triKey=b.TRIATHLON?.format==='Full distance'?'full':b.TRIATHLON?.format==='70.3 / half distance'?'half70':null;
  if(triKey&&b.TRIATHLON?.timeSeconds)pb[triKey]=b.TRIATHLON.timeSeconds/60;
  if(triKey&&b.TRIATHLON?.skipped)skip[triKey]=true;
  const division=b.HYROX?.division==='Doubles'?'doubles':b.HYROX?.division==='Relay'?'relay':'open';
  if(b.HYROX?.timeSeconds)pb[`hy_${division}`]=b.HYROX.timeSeconds/60;
  if(b.HYROX?.skipped)skip[`hy_${division}`]=true;
  const pace=b.SWIM?.paceSeconds?b.SWIM.paceSeconds/60:null;
  const answers:DawnAnswers={version:2,runLongest:runKey,hyCount:b.HYROX?.count??null,hyDivs:b.HYROX?.count?[division]:[],triDone:triKey?[triKey]:[],swimLongest:b.SWIM?.distanceKm===.5?'500':b.SWIM?.distanceKm===1?'1k':b.SWIM?.distanceKm===2?'2k':b.SWIM?.distanceKm!=null&&b.SWIM.distanceKm>=4?'4k':null,swimK:pace===null?null:pace<15?'<15':pace<20?'15-20':pace<25?'20-25':pace<30?'25-30':'30+',ftpKnown:b.RIDE?.ftp?'yes':null,ftp:b.RIDE?.ftp??220,rideLongest:null,days:null,src:null,pb,skip,skippedSports:[]};
  const saved=source.dawn_answers;
  return {profile,answers:saved?.version===2?{...answers,...saved,pb:{...pb,...saved.pb},skip:{...skip,...saved.skip},skippedSports:saved.skippedSports??[]}:answers,sports:DAWN_SPORTS.filter(sport=>source.sports.includes(sport.profile)).map(sport=>sport.id)};
}
export function dawnQuestionError(step:string,profile:AthleteProfile,a:DawnAnswers,sports:DawnSport[]) {
  if(step==='gender'&&!['Woman','Man','Non-binary','Prefer not to say','Self-describe'].includes(profile.gender??''))return 'Choose how you identify.';
  if(step==='gender'&&profile.gender==='Self-describe'&&(!profile.gender_description?.trim()||profile.gender_description.length>40))return 'Add a description of up to 40 characters or choose another option.';
  if(step==='age'&&(!Number.isInteger(profile.age)||profile.age!<1||profile.age!>120))return 'Choose a valid age.';
  if(step==='city'&&!profile.city?.trim())return 'Choose or enter your training city.';
  if(step==='sports'&&!sports.length)return 'Choose at least one sport.';
  if(a.skippedSports.includes(step as DawnSport))return '';
  if(step==='run'&&!RUN_RACES.some(([id])=>id===a.runLongest))return 'Choose your longest race, including None yet.';
  if(step==='hyrox'&&(!Number.isInteger(a.hyCount)||a.hyCount!<0||a.hyCount!>999||a.hyCount!>0&&!a.hyDivs.length))return 'Choose your race count and divisions.';
  if(step==='tri'&&!a.triDone.length)return 'Choose the triathlon distances you’ve finished.';
  if(step==='swim'&&(!a.swimLongest||!a.swimK))return 'Choose your longest swim and time range for 1 km.';
  if(step==='ride'&&(!a.ftpKnown||a.ftpKnown==='no'&&!a.rideLongest||a.ftpKnown==='yes'&&(!Number.isInteger(a.ftp)||a.ftp<1||a.ftp>600)))return 'Add your FTP or longest ride.';
  if(step==='days'&&(!Number.isInteger(a.days)||a.days!<1||a.days!>7))return 'Choose how many days you train.';
  if(step==='source'&&!TRACKERS.some(([id])=>id===a.src))return 'Choose the tracker you use.';
  const key=dawnPBKey(step,a);if(key&&!a.skip[key]){const minutes=a.pb[key]??DAWN_PBS[key][4];if(!Number.isFinite(minutes)||minutes<=0||minutes>2880)return 'Check your finish time or choose Not sure.';}
  return '';
}
export function dawnProfilePayload(profile:AthleteProfile,a:DawnAnswers,sports:DawnSport[]):AthleteProfile {
  const selected=DAWN_SPORTS.filter(sport=>sports.includes(sport.id)).map(sport=>sport.profile),benchmarks={...profile.benchmarks};
  const time=(key:DawnPB|undefined)=>key&&!a.skip[key]?Math.round((a.pb[key]??DAWN_PBS[key][4])*60):undefined;
  for(const sport of ['RUN','RIDE','SWIM','TRIATHLON','HYROX'] as const)if(!selected.includes(sport))delete benchmarks[sport];
  const runKey=dawnPBKey('run',a),hyKey=dawnPBKey('hyrox',a),triKey=dawnPBKey('tri',a);
  if(selected.includes('RUN'))benchmarks.RUN=a.skippedSports.includes('run')?{skipped:true}:a.runLongest==='none'?{skipped:true}:runKey?{distanceKm:({ '5k':5,'10k':10,half:21.1,marathon:42.2,ultra:50 } as Record<string,number>)[runKey],...(time(runKey)?{timeSeconds:time(runKey)}:{skipped:true})}:benchmarks.RUN??{skipped:true};
  if(selected.includes('RIDE'))benchmarks.RIDE=!a.skippedSports.includes('ride')&&a.ftpKnown==='yes'?{ftp:a.ftp}:{skipped:true};
  // A selected swim time range is not an exact measured pace.
  if(selected.includes('SWIM'))benchmarks.SWIM={distanceKm:({'500':.5,'1k':1,'2k':2,'4k':4} as Record<string,number>)[a.swimLongest??'']??1,skipped:true};
  if(selected.includes('TRIATHLON'))benchmarks.TRIATHLON=!a.skippedSports.includes('tri')&&(triKey==='full'||triKey==='half70')?{format:triKey==='full'?'Full distance':'70.3 / half distance',...(time(triKey)?{timeSeconds:time(triKey)}:{skipped:true})}:{skipped:true};
  if(selected.includes('HYROX'))benchmarks.HYROX=a.skippedSports.includes('hyrox')?{skipped:true}:!a.hyCount?{count:0}:{count:a.hyCount,division:hyKey==='hy_doubles'?'Doubles':hyKey==='hy_relay'?'Relay':'Singles',...(time(hyKey)?{timeSeconds:time(hyKey)}:{skipped:true})};
  const previous=dawnHydrate(profile).answers;
  const fingerprint=(id:string,value:DawnAnswers)=>{const key=dawnPBKey(id,value);return JSON.stringify([value.skippedSports.includes(id as DawnSport),id==='run'?value.runLongest:id==='ride'?[value.ftpKnown,value.ftp,value.rideLongest]:id==='swim'?[value.swimLongest,value.swimK]:id==='tri'?value.triDone:[value.hyCount,value.hyDivs],key?value.pb[key]:null,key?value.skip[key]:null]);};
  for(const [id,sport] of [['run','RUN'],['ride','RIDE'],['swim','SWIM'],['tri','TRIATHLON'],['hyrox','HYROX']] as const)if(selected.includes(sport)&&profile.benchmarks?.[sport]&&fingerprint(id,a)===fingerprint(id,previous))benchmarks[sport]=profile.benchmarks[sport];
  return {...profile,full_name:profile.full_name.trim(),city:profile.city?.trim(),sports:selected as AthleteSport[],primary_sport:selected.includes(profile.primary_sport as typeof selected[number])?profile.primary_sport:selected[0],benchmarks,dawn_answers:a};
}
export function dawnSummary(sport:string,a:DawnAnswers) {
  const key=DAWN_SPORTS.find(value=>value.profile===sport)?.id;if(!key||a.skippedSports.includes(key))return 'Benchmarks to add later';
  const pb=(id:DawnPB|undefined)=>id?(a.skip[id]?'Time to add later':dawnMinutes(a.pb[id]??DAWN_PBS[id][4])):'';
  if(key==='run')return a.runLongest==='none'?'First race ahead':`${RUN_RACES.find(([id])=>id===a.runLongest)?.[1]??'Running'} · ${pb(dawnPBKey('run',a))}`;
  if(key==='hyrox')return a.hyCount===0?'No HYROX races yet':`${a.hyCount??0} races · ${a.hyDivs.map(id=>HYROX_DIVISIONS.find(([k])=>k===id)?.[1]).join(', ')} · ${pb(dawnPBKey('hyrox',a))}`;
  if(key==='tri')return `${a.triDone.map(id=>TRI_DISTANCES.find(([k])=>k===id)?.[1]).join(', ')} · ${pb(dawnPBKey('tri',a))}`;
  if(key==='swim')return `${SWIM_DISTANCES.find(([id])=>id===a.swimLongest)?.[1]??'Swimming'} longest · ${SWIM_PACES.find(([id])=>id===a.swimK)?.[1]??'—'} min / km`;
  if(key==='ride')return a.ftpKnown==='yes'?`${a.ftp} W FTP`:`${a.rideLongest==='160'?'160+':a.rideLongest??'—'} km longest ride · FTP to add later`;
  return 'Your training, your way';
}
export function dawnSky(progress:number) {
  const p=Math.max(0,Math.min(1,progress)),from=p<.5?dawnColors.skyStart:dawnColors.skyMid,to=p<.5?dawnColors.skyMid:dawnColors.skyEnd,t=p<.5?p*2:(p-.5)*2;
  const mix=(a:string,b:string)=>'#'+[1,3,5].map(index=>Math.round(parseInt(a.slice(index,index+2),16)*(1-t)+parseInt(b.slice(index,index+2),16)*t).toString(16).padStart(2,'0')).join('');
  return {s0:mix(from[0],to[0]),s1:mix(from[1],to[1]),s2:mix(from[2],to[2]),sunY:420-p*360,starO:Math.max(0,1-p*1.8)};
}
