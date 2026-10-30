import type {AvatarAppearance} from './avatarBuilder';
import {avatarBuilderArtwork} from './avatarBuilderArtwork';
import {dawnSvg} from './dawnSvg';
const {art}=require('./avatarBuilderPalette.cjs');
const {avatarGeometry}: {avatarGeometry:(props:Record<string,unknown>,id:string)=>Record<string,unknown>}=require('./avatarBuilderGeometry.cjs');
export function avatarBuilderSvg(appearance:AvatarAppearance,{crop='full',size=124,id='athlete',pose}:{crop?:'head'|'full';size?:number;id?:string;pose?:AvatarAppearance['pose']}={}){
 const safeId=id.replace(/[^a-zA-Z0-9_-]/g,'')||'athlete';
 return dawnSvg(avatarBuilderArtwork,{...avatarGeometry({...appearance,...(pose?{pose}:{}),crop,size},safeId),art});
}
