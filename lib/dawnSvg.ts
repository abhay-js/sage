import { DawnNode } from './dawnArtwork';
import { dawnColors } from './dawnPalette';
type Scope=Record<string,unknown>;
const tagNames:Record<string,string>={lineargradient:'linearGradient',radialgradient:'radialGradient',clippath:'clipPath'};
const attributeNames:Record<string,string>={viewbox:'viewBox',preserveaspectratio:'preserveAspectRatio',gradientunits:'gradientUnits',gradienttransform:'gradientTransform'};
function value(key:string,scope:Scope):unknown{return key.trim().split('.').reduce<unknown>((current,part)=>(current as Scope)?.[part],scope);}
function escape(text:unknown){return String(text??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function text(template:string,scope:Scope){return template.replace(/\{\{([^}]+)\}\}/g,(_,key)=>String(value(key,scope)??''));}
export function dawnSvg(node:DawnNode,scope:Scope={}):string {
  const context={art:dawnColors.art,...scope};
  const render=(item:DawnNode,vars:Scope):string=>{
    if(typeof item==='string')return escape(text(item,vars));
    const children=(ctx=vars)=>item.children.map(child=>render(child,ctx)).join('');
    if(item.tag==='sc-if'){const key=item.attrs.value?.match(/\{\{(.+)\}\}/)?.[1]??'';return value(key,vars)?children():'';}
    if(item.tag==='sc-for'){const key=item.attrs.list?.match(/\{\{(.+)\}\}/)?.[1]??'',list=value(key,vars);return Array.isArray(list)?list.map(entry=>children({...vars,[item.attrs.as??'item']:entry})).join(''):'';}
    if(item.attrs['data-dawn-phase']!=null&&Number(item.attrs['data-dawn-phase'])!==Number(vars.phase??0))return '';
    const tag=tagNames[item.tag]??item.tag,attrs=Object.entries(item.attrs).filter(([key])=>!['style','class','data-dawn-phase'].includes(key)).map(([key,val])=>`${attributeNames[key]??key}="${escape(text(val??'',vars))}"`).join(' ');
    return `<${tag}${attrs?' '+attrs:''}>${children()}</${tag}>`;
  };
  return render(node,context);
}
