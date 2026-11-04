import type {AthleteAvatar} from './avatar';
import {avatarAppearance} from './avatarBuilder';
import {avatarIdentityArtwork,avatarTorsoArtwork} from './avatarIdentityArtwork';
import {dawnSvg} from './dawnSvg';
const {avatarGeometry}=require('./avatarBuilderGeometry.cjs');
const {art}=require('./avatarBuilderPalette.cjs');
/** Apply the saved identity without replacing the mood rig's articulated limbs. */
export function personalizeHomeRig(source:string,avatar?:Partial<AthleteAvatar>|null){
 if(!avatar)return source;
 const values=avatarGeometry({...avatarAppearance(avatar),height:'medium',pose:'stand'},'camp-athlete');
 const start=source.indexOf('<g class="ar-head">');
 let end=start,depth=0;
 for(const match of source.slice(start).matchAll(/<g\b[^>]*>|<\/g>/g)){
  depth+=match[0].startsWith('</')?-1:1;
  if(depth===0){end=start+match.index!+match[0].length;break;}
 }
 const head=dawnSvg(avatarIdentityArtwork,{...values,art});
 let xml=source.slice(0,start)+`<g class="ar-head">${head}</g>`+source.slice(end);
 const colors:Record<string,string>={'#C68A60':values.skin,'#a67451':values.shade,'#77533a':values.deep,'#2F6B57':values.topCol,'#EEF2F5':values.shoeCol,'#C9D2D9':values.soleCol};
 // Recolour the original rig only; the inserted profile layers already use saved colours.
 const recolor=(part:string)=>part.replace(/#[\da-fA-F]{6}/g,color=>colors[color]??color);
 xml=recolor(source.slice(0,start))+`<g class="ar-head">${head}</g>`+recolor(source.slice(end));
 const torso=dawnSvg(avatarTorsoArtwork,{...values,art});
 xml=xml.replace(/(<g class="ar-chest">)[\s\S]*?(<g display="\{\{show.towel\}\}">)/,(_,start,towel)=>start+torso+towel);
 xml=xml.replace(/stroke="#0F1B24" stroke-width="(28|30)"/g,`stroke="${values.bottomCol}" stroke-width="$1"`);
 return xml;
}
