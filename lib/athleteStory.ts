import type { AthleteProfile, AthleteSport } from '../types/product';
export type BenchmarkSport = 'RUN'|'RIDE'|'SWIM'|'TRIATHLON'|'HYROX';
export interface AthleteBenchmark {
  skipped?: boolean; distanceKm?: number; timeSeconds?: number; ftp?: number;
  paceSeconds?: number; format?: 'Full distance'|'70.3 / half distance';
  count?: number; division?: 'Singles'|'Doubles'|'Relay';
}
export type AthleteBenchmarks = Partial<Record<BenchmarkSport,AthleteBenchmark>>;
export const STORY_SPORTS = [
  {id:'RUN',name:'Runner',icon:'activity',detail:'From first steps to ultra trails',title:'Your running profile.'},
  {id:'RIDE',name:'Cyclist',icon:'bike',detail:'Road, gravel or the trainer',title:'Your cycling profile.'},
  {id:'SWIM',name:'Swimmer',icon:'swim',detail:'Pool lanes and open water',title:'Your swimming profile.'},
  {id:'TRIATHLON',name:'Ironman athlete',icon:'flag',detail:'Three sports. One finish line.',title:'Your Ironman experience.'},
  {id:'HYROX',name:'HYROX athlete',icon:'strength',detail:'Run. Work. Repeat.',title:'Your HYROX experience.'},
  {id:'STRENGTH',name:'Strength athlete',icon:'strength',detail:'Build a stronger foundation',title:''},
  {id:'OTHER',name:'Another sport',icon:'activity',detail:'There is more than one way to move',title:''},
] as const;
export const GENDER_OPTIONS=['Woman','Man','Non-binary','Prefer not to say','Self-describe'];
export function storyAge(profile:Pick<AthleteProfile,'age'|'date_of_birth'>,today=new Date()) {
  if(profile.age!=null)return profile.age;
  if(!profile.date_of_birth)return 25;
  const birth=new Date(`${profile.date_of_birth}T12:00:00`);
  if(!Number.isFinite(birth.getTime()))return 25;
  return Math.max(1,Math.min(120,today.getFullYear()-birth.getFullYear()-(today.getMonth()<birth.getMonth()||today.getMonth()===birth.getMonth()&&today.getDate()<birth.getDate()?1:0)));
}
export function storySteps(sports:AthleteSport[]) {return ['basics','sports',...STORY_SPORTS.filter(s=>s.title&&sports.includes(s.id)).map(s=>s.id),'review'];}
export function benchmarkDefaults(sport:BenchmarkSport):AthleteBenchmark {
  return sport==='RUN'?{distanceKm:10,timeSeconds:3600}:sport==='RIDE'?{ftp:200}:sport==='SWIM'?{distanceKm:1,paceSeconds:1200}:sport==='TRIATHLON'?{format:'Full distance',timeSeconds:43200}:{count:0,division:'Singles'};
}
export function benchmarkError(sport:BenchmarkSport,value:AthleteBenchmark) {
  if(value.skipped)return '';
  const positive=(n:unknown,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=max;
  const time=(n:unknown)=>positive(n,172800)&&Number.isInteger(n);
  if(sport==='RUN'&&(!positive(value.distanceKm,250)||!time(value.timeSeconds)))return 'Add a run distance and time, or choose to add this later.';
  if(sport==='RIDE'&&(!positive(value.ftp,600)||!Number.isInteger(value.ftp)))return 'Choose an FTP from 1 to 600 watts, or add it later.';
  if(sport==='SWIM'&&(!positive(value.distanceKm,20)||!time(value.paceSeconds)))return 'Add a swim distance and time per kilometre, or add this later.';
  if(sport==='TRIATHLON'&&(!time(value.timeSeconds)||!['Full distance','70.3 / half distance'].includes(value.format??'')))return 'Choose your race format and finish time, or add this later.';
  if(sport==='HYROX'&&(!Number.isInteger(value.count)||value.count!<0||value.count!>999||value.count!>0&&(!time(value.timeSeconds)||!['Singles','Doubles','Relay'].includes(value.division??''))))return 'Check your race count and finish time, or add your time later.';
  return '';
}
export function storyBasicsError(profile:AthleteProfile) {
  if(profile.full_name.trim().length<2||profile.full_name.trim().length>120)return 'Enter a name between 2 and 120 characters.';
  if(!Number.isInteger(profile.age)||profile.age!<1||profile.age!>120)return 'Choose an age from 1 to 120.';
  if(!GENDER_OPTIONS.includes(profile.gender??''))return 'Choose a gender option, including Prefer not to say if you wish.';
  if(profile.gender==='Self-describe'&&!profile.gender_description?.trim())return 'Add your gender description or choose another option.';
  return '';
}
export function benchmarkSummary(sport:string,value?:AthleteBenchmark) {
  if(sport==='HYROX'&&value?.skipped&&value.count)return `${value.count} race${value.count===1?'':'s'} · Best time to add later`;
  if(!value||value.skipped)return 'Benchmarks to add later';
  const duration=(seconds=0)=>[Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
  if(sport==='RUN')return `${value.distanceKm} km longest run · ${duration(value.timeSeconds)}`;
  if(sport==='RIDE')return `${value.ftp} W FTP`;
  if(sport==='SWIM')return `${value.distanceKm} km longest swim · ${duration(value.paceSeconds)} per km`;
  if(sport==='TRIATHLON')return `${value.format} · ${duration(value.timeSeconds)}`;
  if(sport==='HYROX')return !value.count?'No HYROX races yet':`${value.count} race${value.count===1?'':'s'} · ${value.division} · ${duration(value.timeSeconds)}`;
  return 'Your training, your way';
}
