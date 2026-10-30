import { ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { adventureColors as c } from '../../lib/theme';
import { SageIcon, SageIconName } from './SageIcon';
import { s as base, Avatar } from './SageUI';
import { useAthleteProfile } from '../../hooks/useProduct';
import { AthleteIllustration } from './AdventureArt';
export { Avatar };

export function AdventureBrand({compact=false}:{compact?:boolean}={}) {
  const router = useRouter();
  const { data } = useAthleteProfile();
  return <View style={[s.between, { marginBottom: compact?8:14 }]}>
    <Text accessibilityLabel="Sage" style={{ color: c.text, fontSize: 25, fontWeight: '900', letterSpacing: 3 }}>SAGE<Text style={{ color: c.orange }}>✦</Text></Text>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="My athlete" onPress={() => router.push('/(app)/log')} style={{ backgroundColor: c.pale, width: 44, height: 44, borderRadius: 24, alignItems:'center', justifyContent:'center', overflow:'hidden' }}><AthleteIllustration current avatar={data?.profile?.avatar} size={32}/></TouchableOpacity>
  </View>;
}
export function Page({ children, brand = false }: { children: ReactNode; brand?: boolean }) {
  return <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 16, width: '100%', maxWidth: 520, alignSelf: 'center' }}>{brand && <AdventureBrand />}{children}</ScrollView></SafeAreaView>;
}
export function BackAction({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} style={{ minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center' }}><Text style={{ color:c.orange,fontWeight:'700',fontSize:12 }}>{label}</Text></TouchableOpacity>;
}
export function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <Modal transparent animationType="fade" visible onRequestClose={onClose}><SafeAreaView style={{ flex:1,backgroundColor:c.ink+'99',justifyContent:'center',padding:16 }}><Pressable onPress={onClose} accessibilityLabel="Close dialog" style={StyleSheet.absoluteFill}/><View accessibilityViewIsModal style={[s.card,{width:'100%',maxWidth:500,maxHeight:'95%',alignSelf:'center',backgroundColor:c.bg,padding:20}]}><View style={[s.between,{marginBottom:16,gap:10}]}><Text accessibilityRole="header" style={[s.title,{fontSize:23,lineHeight:28,flex:1}]}>{title}</Text><BackAction label="Close" onPress={onClose}/></View><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView></View></SafeAreaView></Modal>;
}
export function Header({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: ReactNode }) {
  return <View style={[s.between, { marginBottom: 14, gap: 12 }]}><View style={{ flex: 1 }}>{eyebrow && <Text style={s.eyebrow}>{eyebrow.toUpperCase()}</Text>}<Text accessibilityRole="header" style={s.title}>{title}</Text></View>{action}</View>;
}
export function Button({ title, onPress, icon = 'arrow', disabled = false, secondary = false }: { title: string; onPress: () => void; icon?: SageIconName; disabled?: boolean; secondary?: boolean }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} activeOpacity={0.8} style={[s.between, { backgroundColor: secondary ? c.surface : c.primary, borderRadius: 16, borderWidth: 1, borderColor: secondary ? c.border : c.primary, paddingHorizontal: 18, paddingVertical: 13, minHeight: 48, gap: 10, opacity: disabled ? 0.45 : 1 }]}><Text style={{ color: secondary ? c.text : c.onAccent, fontWeight: '800', fontSize: 13, flexShrink: 1 }}>{title}</Text><SageIcon name={icon} size={18} color={secondary ? c.green : c.onAccent} /></TouchableOpacity>;
}
export function Section({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={[s.between, { marginTop: 18, marginBottom: 10, gap: 12 }]}><Text accessibilityRole="header" style={[s.section, { flexShrink: 1 }]}>{title}</Text>{action && <TouchableOpacity accessibilityRole="button" onPress={onPress} style={{ paddingVertical: 8,minHeight:44,justifyContent:'center' }}><Text style={{ color: c.orange, fontWeight: '700', fontSize: 11 }}>{action}</Text></TouchableOpacity>}</View>;
}
export function Empty({ text, loading = false }: { text: string; loading?: boolean }) {
  return <View style={[s.card, { padding: 26, alignItems: 'center' }]}>{loading ? <ActivityIndicator color={c.green} /> : <SageIcon name="mountain" size={30} color={c.green} />}<Text style={[s.muted, { textAlign: 'center', marginTop: 12 }]}>{loading ? 'Loading your adventure…' : text}</Text></View>;
}
export function Chips({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 12 }}>
    {options.map(option => <TouchableOpacity key={option.id} accessibilityRole="button" aria-pressed={option.id === value} accessibilityState={{ selected: option.id === value }} onPress={() => onChange(option.id)} style={{ paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: 'center', borderRadius: 24, borderWidth: 1, borderColor: option.id === value ? c.text : c.border, backgroundColor: option.id === value ? c.text : c.surface }}><Text style={{ fontSize: 11, fontWeight: '700', color: option.id === value ? c.onAccent : c.muted }}>{option.label}</Text></TouchableOpacity>)}
  </ScrollView>;
}
export function MetricGrid({ items }: { items: [string, string | number][] }) {
  return <View style={[s.row, { flexWrap: 'wrap', gap: 10, marginVertical: 12 }]}>{items.map(([label, value]) => <View key={label} style={[s.card, { padding: 14, flexBasis: '45%', flexGrow: 1 }]}><Text style={s.label}>{label.toUpperCase()}</Text><Text style={{ color: c.text, fontWeight: '800', fontSize: 26, marginTop: 8 }}>{value}</Text></View>)}</View>;
}
export const s = StyleSheet.create({ ...base,
  title: { color: c.text, fontSize: 29, fontWeight: '800', letterSpacing: -1.2, lineHeight: 35 },
  eyebrow: { color: c.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.8, marginBottom: 8 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.divider, borderRadius: 22, overflow: 'hidden' },
  section: { color: c.text, fontWeight: '800', fontSize: 17 },
  muted: { color: c.muted, fontSize: 14, lineHeight: 21 },
  label: { color: c.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
});
