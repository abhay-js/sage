import {AVATAR_OPTIONS,AVATAR_DEFAULTS,AVATAR_GROUPS,AVATAR_SWATCHES,AVATAR_LABELS,AVATAR_CONTEXT_LABELS} from './avatarBuilderData';
import type {AthleteAvatar} from './avatar';
export {AVATAR_OPTIONS,AVATAR_GROUPS,AVATAR_SWATCHES};
export type AvatarFeature=keyof typeof AVATAR_OPTIONS;
export type AvatarAppearance={[K in AvatarFeature]:typeof AVATAR_OPTIONS[K][number]};
export const DEFAULT_APPEARANCE:AvatarAppearance={...AVATAR_DEFAULTS};
export const avatarFeatures=Object.keys(AVATAR_OPTIONS) as AvatarFeature[];
export function normalizeAppearance(value:unknown):AvatarAppearance{
 const input=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
 return Object.fromEntries(avatarFeatures.map(key=>[key,(AVATAR_OPTIONS[key] as readonly unknown[]).includes(input[key])?input[key]:DEFAULT_APPEARANCE[key]])) as AvatarAppearance;
}
export function avatarFeatureLabel(key:AvatarFeature,value:string){
 const contextual=AVATAR_CONTEXT_LABELS as Record<string,string>,labels=AVATAR_LABELS as Record<string,string>;
 return contextual[`${key}:${value}`]??labels[value]??value.charAt(0).toUpperCase()+value.slice(1);
}
export function avatarAppearance(value?:Partial<AthleteAvatar>|null):AvatarAppearance{
 if(value?.appearance)return normalizeAppearance(value.appearance);
 return {...DEFAULT_APPEARANCE,
  skin:({warm:'t5',deep:'t7',light:'t3',dark:'t9'} as const)[value?.skin??'warm']??'t5',
  topColor:({orange:'orange',forest:'sage',lilac:'purple',gold:'gold',charcoal:'charcoal'} as const)[value?.kit??'orange']??'orange',
  headwear:value?.gear==='None'?'none':value?.gear==='Band'?'headband':'cap',
  ...(value?.movement==='Ride'?{top:'jersey' as const,shoes:'cycling' as const}:value?.movement==='Swim'?{top:'trisuit' as const,headwear:'swimcap' as const,eyewear:'goggles' as const}:{}),
 };
}
/** Cosmetic fields retain a valid fallback for older installed apps. */
export function withAvatarAppearance(base:AthleteAvatar,appearance:AvatarAppearance):AthleteAvatar{
 const a=normalizeAppearance(appearance),tone=Number(a.skin.slice(1));
 const skin=tone<=3?'light':tone<=5?'warm':tone<=7?'deep':'dark';
 const kit:AthleteAvatar['kit']=a.topColor==='sage'||a.topColor==='mint'?'forest':a.topColor==='gold'?'gold':['purple','pink','sky'].includes(a.topColor)?'lilac':['ink','charcoal','navy','white'].includes(a.topColor)?'charcoal':'orange';
 return {...base,skin,kit,gear:a.headwear==='cap'||a.headwear==='backcap'?'Cap':a.headwear==='headband'||a.headwear==='visor'?'Band':'None',appearance:a};
}
export function surpriseAvatar(current:AvatarAppearance,random:()=>number=Math.random):AvatarAppearance{
 const pick=(values:readonly string[])=>values[Math.max(0,Math.min(values.length-1,Math.floor(random()*values.length)))];
 const next=Object.fromEntries(avatarFeatures.map(key=>[key,pick(AVATAR_OPTIONS[key])])) as AvatarAppearance;
 for(const key of ['headwear','eyewear','earwear','neckwear','hands','back','details'] as const)if(random()<.6)next[key]='none';
 if(['blue','pink','green','white'].includes(next.hairColor)&&random()<.7)next.hairColor='black';
 next.pose='stand';
 if(avatarFeatures.every(key=>next[key]===current[key]))next.hair=current.hair==='quiff'?'curly':'quiff';
 return next;
}
export function avatarHeadCategory(group:string,feature:AvatarFeature){return group==='face'||group==='hair'||['headwear','eyewear','earwear'].includes(feature);}
