import { ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {useSegments} from 'expo-router';
import { sageColors as c } from '../../lib/theme';
import { SageIcon, SageIconName } from './SageIcon';
export function Page({ children }: { children: ReactNode }) {
  const segments=useSegments(),dimensions=useWindowDimensions(),desktopAdmin=segments[0]==='(admin)'&&dimensions.width>=900,edges=segments[0]==='(admin)'?(['left','right'] as const):segments[0]==='(app)'?(['top'] as const):(['top','bottom'] as const);
  return <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={edges}><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: desktopAdmin?32:16, paddingTop: desktopAdmin?28:12, paddingBottom: desktopAdmin?48:16, width: '100%', maxWidth: desktopAdmin?1200:520, alignSelf: 'center' }}>{children}</ScrollView></SafeAreaView>;
}
export function Avatar({ name, current = false, size = 40 }: { name?: string; current?: boolean; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: c.surface, backgroundColor: current ? c.orange : c.green, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c.onAccent, fontWeight: '800', fontSize: size / 3 }}>{name?.trim().slice(0, 1).toUpperCase() || '?'}</Text></View>;
}
export function Brand() { return <View style={s.row}><View style={{ backgroundColor: c.green, borderRadius: 2, padding: 6, marginRight: 14, transform: [{ rotate: '45deg' }] }}><View style={{ transform: [{ rotate: '-45deg' }] }}><SageIcon name="mountain" color={c.onAccent} size={18} /></View></View><Text style={{ color: c.text, fontWeight: '800', fontSize: 18, letterSpacing: 4 }}>SAGE</Text></View>; }
export function Header({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: ReactNode }) { return <View style={[s.between, { marginBottom: 14 }]}><View style={{ flex: 1 }}>{eyebrow && <Text style={s.eyebrow}>{eyebrow.toUpperCase()}</Text>}<Text style={s.title}>{title}</Text></View>{action}</View>; }
export function Button({ title, onPress, icon = 'arrow', disabled = false }: { title: string; onPress: () => void; icon?: SageIconName; disabled?: boolean }) { return <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled }} onPress={onPress} disabled={disabled} activeOpacity={0.8} style={[s.between, { minHeight: 48, padding: 14, borderRadius:18, backgroundColor:c.primary, gap: 12, opacity: disabled ? 0.5 : 1 }]}><Text style={{ flex: 1, color: c.onAccent, fontWeight: '800', fontSize: 14 }}>{title}</Text><SageIcon name={icon} color={c.onAccent} size={18} /></TouchableOpacity>; }
export function Section({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) { return <View style={[s.between, { marginTop: 18, marginBottom: 10 }]}><Text style={s.section}>{title}</Text>{action && <TouchableOpacity accessibilityRole="button" onPress={onPress}><Text style={{ color: c.orange, fontWeight: '800', fontSize: 12 }}>{action}</Text></TouchableOpacity>}</View>; }
export function Empty({ text, loading = false }: { text: string; loading?: boolean }) { return <View style={[s.card, { padding: 28, alignItems: 'center' }]}>{loading ? <ActivityIndicator color={c.green} /> : <SageIcon name="mountain" size={32} />}<Text style={[s.muted, { textAlign: 'center', marginTop: 12 }]}>{loading ? 'Loading your training…' : text}</Text></View>; }
export const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 30, fontWeight: '700', color: c.text, letterSpacing: -1.2 }, eyebrow: { fontSize: 10, color: c.muted, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  section: { fontSize: 15, fontWeight: '800', color: c.text }, muted: { fontSize: 13, lineHeight: 20, color: c.muted },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, overflow: 'hidden' },
  body: { padding: 20 }, label: { color: c.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 }, value: { color: c.text, fontSize: 23, fontWeight: '800', marginTop: 5 },
});
