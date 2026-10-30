import {useEffect,useState} from 'react';
import {Keyboard,Platform,StyleSheet,Text,TouchableOpacity,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {appTabs,parentAppTab,NavigationItem} from '../../lib/appNavigation';
import {sageColors as c} from '../../lib/theme';
import {SageIcon} from './SageIcon';
interface Props extends BottomTabBarProps {record?:{status:string;sport:string}|null;items?:NavigationItem[];parentTab?:(route:string)=>string;floating?:boolean}
export function AppTabBar({state,navigation,record,items=appTabs,parentTab=parentAppTab,floating=false}:Props){
 const insets=useSafeAreaInsets(),[keyboard,setKeyboard]=useState(false),current=state.routes[state.index]?.name,active=parentTab(current);
 useEffect(()=>{if(Platform.OS==='web')return;const show=Keyboard.addListener('keyboardDidShow',()=>setKeyboard(true)),hide=Keyboard.addListener('keyboardDidHide',()=>setKeyboard(false));return()=>{show.remove();hide.remove();};},[]);
 if(current==='profile-edit'||keyboard)return null;
 function open(name:string){const route=state.routes.find(value=>value.name===name);if(!route)return;const event=navigation.emit({type:'tabPress',target:route.key,canPreventDefault:true});if(!event.defaultPrevented&&current!==name)navigation.navigate(route.name,route.params);}
 return <View pointerEvents={floating?'box-none':'auto'} style={[s.shell,floating&&s.floating,{paddingBottom:Math.max(insets.bottom,8),paddingLeft:Math.max(insets.left,12),paddingRight:Math.max(insets.right,12)}]}>
  {record&&current!=='record-activity'&&<TouchableOpacity accessibilityRole="button" accessibilityLabel="Return to your recording" onPress={()=>open('record-activity')} style={s.recording}><View style={s.recordingDot}/><Text style={s.recordingText}>{record.status==='recording'?'Recording':record.status==='paused'?'Paused':'Ready for review'} · {record.sport}</Text><SageIcon name="chevron" size={16} color={c.green}/></TouchableOpacity>}
  <View accessibilityRole="tablist" accessibilityLabel="Main navigation" style={s.bar}>{items.map(tab=>{const selected=active===tab.name,add=tab.name==='record-activity';return <TouchableOpacity accessibilityRole="tab" accessibilityLabel={add?'Add a workout':tab.title} accessibilityState={{selected}} key={tab.name} onPress={()=>open(tab.name)} onLongPress={()=>{const route=state.routes.find(value=>value.name===tab.name);if(route)navigation.emit({type:'tabLongPress',target:route.key});}} style={s.item}>
   {add?<View style={[s.add,floating&&{borderColor:c.surface},selected&&{backgroundColor:c.green}]}><SageIcon name="plus" size={24} color={c.onAccent}/></View>:<><SageIcon name={tab.icon} size={22} color={selected?c.text:c.muted}/><Text numberOfLines={1} style={[s.label,{color:selected?c.text:c.muted,fontWeight:selected?'800':'600'}]}>{tab.title}</Text></>}
  </TouchableOpacity>;})}</View>
 </View>;
}
const s=StyleSheet.create({shell:{backgroundColor:c.bg,paddingTop:8,alignItems:'center'},floating:{position:'absolute',bottom:0,left:0,right:0,backgroundColor:'transparent'},bar:{width:'100%',maxWidth:520,height:64,borderRadius:22,backgroundColor:c.surface,flexDirection:'row',alignItems:'center',shadowColor:c.ink,shadowOpacity:.10,shadowRadius:16,shadowOffset:{width:0,height:3},elevation:5,borderWidth:1,borderColor:c.divider},item:{flex:1,height:64,minWidth:44,alignItems:'center',justifyContent:'center',gap:3},label:{fontSize:11,lineHeight:14},add:{width:54,height:54,borderRadius:27,borderWidth:4,borderColor:c.bg,backgroundColor:c.primary,alignItems:'center',justifyContent:'center',transform:[{translateY:-8}]},recording:{width:'100%',maxWidth:520,minHeight:40,marginBottom:8,paddingHorizontal:14,borderRadius:14,backgroundColor:c.pale,flexDirection:'row',alignItems:'center',gap:8},recordingDot:{width:7,height:7,borderRadius:4,backgroundColor:c.green},recordingText:{flex:1,color:c.green,fontSize:12,fontWeight:'700'}});
