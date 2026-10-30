import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { adventureColors as c } from '../../lib/theme';
import { SageIcon } from './SageIcon';

export function ProfileHeader({ title, detail = false }: { title: string; detail?: boolean }) {
  const router = useRouter();
  return <View style={styles.header}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={detail ? 'Back to profile' : 'Back to home'} onPress={() => router.replace(detail ? '/(app)/log' : '/(app)/home')} style={styles.back}>
      <View style={{ transform: [{ rotate: '180deg' }] }}><SageIcon name="arrow" size={21} color={c.text} /></View>
    </TouchableOpacity>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    <View style={{ width: 44 }} />
  </View>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  back: { width: 44, height: 44, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', color: c.text, fontSize: 18, fontWeight: '700' },
});
