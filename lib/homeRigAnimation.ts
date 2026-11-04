import {rigMotion, rigOrigins} from './homeAthleteMotion';
import {personalizeHomeRig} from './homeAvatarIdentity';
import type {AthleteAvatar} from './avatar';
import {homeAthleteRig} from './homeAthleteRig';
import type {AthleteMood} from '../components/ui/AthleteMood';
type Frame={at:number;transform?:string;opacity?:string};
type Track={frames:Frame[];seconds:number;step:boolean};
const tracks=rigMotion as Record<AthleteMood,Record<string,Track>>;
function pose(value='') {
 const p={x:0,y:0,r:0,sx:1,sy:1,k:0};
 for(const m of value.matchAll(/(translate|translateX|translateY|rotate|scale|scaleX|scaleY|skewX)\(([^)]+)\)/g)) {
  const n=m[2].split(/[, ]+/).map(parseFloat);
  if(m[1]==='translate'){p.x=n[0];p.y=n[1]??0;}else if(m[1]==='translateX')p.x=n[0];else if(m[1]==='translateY')p.y=n[0];
  else if(m[1]==='rotate')p.r=n[0];else if(m[1]==='scale'){p.sx=n[0];p.sy=n[1]??n[0];}else if(m[1]==='scaleX')p.sx=n[0];else if(m[1]==='scaleY')p.sy=n[0];else p.k=n[0];
 }
 return p;
}
function ease(x:number){let lo=0,hi=1,t=x;const bez=(t:number,a:number,b:number)=>3*(1-t)**2*t*a+3*(1-t)*t*t*b+t*t*t;for(let i=0;i<10;i++){t=(lo+hi)/2;if(bez(t,.45,.35)<x)lo=t;else hi=t;}return bez(t,.05,1);}
function sample(track:Track,time:number,attributes=''){
 const f=track.frames,t=(time%track.seconds)/track.seconds;
 const next=f.findIndex(v=>v.at>t),b=f[next<0?f.length-1:next],a=f[Math.max(0,(next<0?f.length-1:next)-1)];
 const u=track.step?0:ease(Math.max(0,Math.min(1,(t-a.at)/(b.at-a.at||1))));
 const resolve=(value='')=>value.replace(/var\((--[\w-]+)\)/g,(_,key)=>attributes.match(new RegExp(key+':\\s*([-\\d.]+)'))?.[1]??'0');
 const pa=pose(resolve(a.transform)),pb=pose(resolve(b.transform));
 return {p:Object.fromEntries(Object.keys(pa).map(k=>[k,pa[k as keyof typeof pa]+(pb[k as keyof typeof pb]-pa[k as keyof typeof pa])*u])) as ReturnType<typeof pose>,opacity:a.opacity!==undefined?Number(a.opacity)+(Number(b.opacity??a.opacity)-Number(a.opacity))*u:undefined};
}
const escape=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
/** Keep the original joint pivots and keyframes on native, where SVG CSS is unsupported. */
export function homeRigFrame(mood:AthleteMood,seconds:number,size:number,avatar?:AthleteAvatar|null) {
 const sit=['fresh','sleepy','recovering'].includes(mood);
 const show:Record<string,boolean>={standLegs:!sit,sitLegs:sit,seat:sit,pole:false,arms:mood!=='recovering',blanket:mood==='recovering',medal:mood==='proud',dust:false,zzz:mood==='sleepy',bubble:mood==='restless'||mood==='tired',confetti:mood==='proud',burst:mood==='celebrating',sticker:mood==='celebrating',flames:false,towel:mood==='tired'};
 let xml=personalizeHomeRig(homeAthleteRig,avatar).replace(/\{\{([^}]+)\}\}/g,(_,key:string)=>{
  if(key==='w')return String(size*340/460);if(key==='h')return String(size);if(key==='cls')return '';if(key==='label')return 'Your athlete';
  if(key==='postureT')return sit?'translate(0 44)':'translate(0 0)';if(key==='shadowY')return sit?'340':'384';
  if(key==='bubbleText')return mood==='restless'?'Shall we go?':'Recovery day?';if(key==='stickerText')return 'Well done';
  if(key.startsWith('show.'))return show[key.slice(5)]?'inline':'none';if(key.startsWith('f.'))return key.slice(2)===mood?'inline':'none';return '';
 });
 xml=xml.replace(/<([\w]+)\b([^>]*\bclass="([^"]+)"[^>]*)>/g,(all,tag,attrs,classes:string)=>{
  let transform='',opacity:number|undefined;
  for(const cls of classes.split(' ')) {
   const track=tracks[mood]?.[cls];
   if(track){const v=sample(track,seconds,attrs),o=rigOrigins[cls]??(cls==='ar-shadow'?[100,sit?340:384]:[100,238]),p=v.p;transform=`translate(${p.x} ${p.y}) translate(${o[0]} ${o[1]}) rotate(${p.r}) scale(${p.sx} ${p.sy}) skewX(${p.k}) translate(${-o[0]} ${-o[1]})`;opacity=v.opacity;}
   if(cls==='ar-chest'&&!track)transform=`translate(100 238) scale(${1+.012*(1-Math.cos(seconds/3.4*Math.PI*2))/2} ${1+.028*(1-Math.cos(seconds/3.4*Math.PI*2))/2}) translate(-100 -238)`;
   if(cls==='ar-blink'){const t=seconds%4.6;const sy=t>1.9&&t<2.05?.08:1;transform=`translate(100 76) scale(1 ${sy}) translate(-100 -76)`;}
   if(cls==='ar-z'){const t=((seconds+Number(attrs.match(/--dl:\s*(-?[\d.]+)/)?.[1]??0))%3+3)%3/3;transform=`translate(${26*t} ${-58*t})`;opacity=Math.sin(t*Math.PI);}
   if(cls==='ar-conf'||cls==='ar-burstp'){const i=Number(attrs.match(/--dx:\s*(-?[\d.]+)/)?.[1]??12),t=((seconds+Math.abs(i)*.07)%3)/3;transform=`translate(${i*t} ${-40+t*330}) rotate(${t*240} 100 20)`;opacity=Math.sin(Math.PI*t);}
   if(cls==='ar-steam'){const t=(seconds%2.4)/2.4;transform=`translate(${3*t} ${6-32*t})`;opacity=Math.sin(t*Math.PI)*.85;}
  }
  if(transform)attrs=attrs.replace(/\s+transform="[^"]*"/g,'')+` transform="${escape(transform)}"`;
  if(opacity!==undefined)attrs=attrs.replace(/\s+opacity="[^"]*"/g,'')+` opacity="${opacity}"`;
  return `<${tag}${attrs}>`;
 });
 return xml.replace(/\s+(?:class|style)="[^"]*"/g,'');
}
