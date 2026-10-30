import { useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import { adventureColors as c } from '../../lib/theme';
export interface StorySliderProps {label:string;value:number;min:number;max:number;step?:number;onChange:(value:number)=>void;disabled?:boolean;variant?:'dawn';colors?:{track:string;fill:string;thumb:string;border:string}}
export function StorySlider({label,value,min,max,step=1,onChange,disabled=false,colors}:StorySliderProps) {
  const track=useRef<View>(null),[width,setWidth]=useState(1),origin=useRef(0);
  const latest=useRef({min,max,step,onChange,disabled,width});latest.current={min,max,step,onChange,disabled,width};
  const change=(pageX:number)=>{const p=latest.current;if(p.disabled)return;const raw=p.min+(pageX-origin.current)/Math.max(1,p.width)*(p.max-p.min);p.onChange(Math.max(p.min,Math.min(p.max,Math.round(raw/p.step)*p.step)));};
  const pan=useRef(PanResponder.create({onStartShouldSetPanResponder:()=>!latest.current.disabled,onMoveShouldSetPanResponder:()=>!latest.current.disabled,onPanResponderGrant:event=>{const x=event.nativeEvent.pageX;track.current?.measureInWindow(left=>{origin.current=left;change(x);});},onPanResponderMove:event=>change(event.nativeEvent.pageX)})).current;
  const fraction=(value-min)/(max-min);
  return <View ref={track} onLayout={event=>setWidth(event.nativeEvent.layout.width)} {...pan.panHandlers} accessible accessibilityRole="adjustable" accessibilityState={{disabled}} accessibilityLabel={label} accessibilityValue={{min,max,now:value}} accessibilityActions={[{name:'increment'},{name:'decrement'}]} onAccessibilityAction={event=>{if(!disabled)onChange(Math.max(min,Math.min(max,value+(event.nativeEvent.actionName==='increment'?step:-step))));}} style={{height:40,justifyContent:'center',opacity:disabled?0.45:1}}><View style={{height:7,backgroundColor:colors?.track??c.pale,borderRadius:8}}><View style={{width:`${Math.max(0,Math.min(1,fraction))*100}%`,height:7,borderRadius:8,backgroundColor:colors?.fill??c.orange}}/></View><View pointerEvents="none" style={{position:'absolute',left:Math.max(0,Math.min(width-28,fraction*(width-28))),height:colors?28:23,width:colors?28:23,borderRadius:15,borderWidth:4,borderColor:colors?.border??c.surface,backgroundColor:colors?.thumb??c.orange}}/></View>;
}
