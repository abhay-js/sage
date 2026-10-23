import { Link } from 'expo-router';
import Head from 'expo-router/head';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brand } from '../components/ui/SageUI';
import { SageIcon, SageIconName } from '../components/ui/SageIcon';
import { MountainArt } from '../components/ui/MountainArt';
import { sageColors as c } from '../lib/theme';

const features: { icon: SageIconName; title: string; description: string }[] = [
  { icon: 'route', title: 'Every workout, together', description: 'Record runs, walks and rides with GPS in the Sage mobile app. Import Apple Health workouts on iPhone, Health Connect workouts on Android, or upload a .FIT file from your fitness device.' },
  { icon: 'heart', title: 'See the work behind the numbers', description: 'Explore distance, duration, pace, heart rate and routes when your workout source includes them. Indoor sessions count too.' },
  { icon: 'mountain', title: 'Give consistency a destination', description: 'Join a challenge for your training level. Earn points from approved workouts, follow your rank and keep climbing the mountain.' },
  { icon: 'shield', title: 'A fair climb for everyone', description: 'Sage administrators review submitted workouts and evidence, approve valid activities and help keep challenge scores fair.' },
];

export default function LandingPage() {
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <Head>
        <title>Sage — Every workout. Another step up.</title>
        <meta name="description" content="Sage brings endurance workouts, training insights and fitness challenges together. Record GPS workouts, import activities and climb with your community." />
      </Head>
      <View style={styles.navBar}>
        <View style={styles.navInner}>
          <Link href="/" asChild><Pressable accessibilityRole="link" accessibilityLabel="Sage homepage"><Brand /></Pressable></Link>
          <View style={styles.navLinks}>
            {width >= 600 && <Link href="/privacy" style={styles.navLink}>Privacy</Link>}
            <Link href="/(auth)/login" style={styles.navLink}>Log in</Link>
            <Link href="/(auth)/signup" style={styles.navButton}>Get started</Link>
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <View style={[styles.hero, wide && styles.heroWide]}>
            <View style={{ flex: 1 }}>
              <View style={styles.badge}><SageIcon name="sun" size={15} /><Text style={styles.badgeText}>TRAIN WITH THE VILLAGE</Text></View>
              <Text accessibilityRole="header" style={[styles.headline, { fontSize: wide ? 66 : 43, lineHeight: wide ? 72 : 49 }]}>Every workout.{ '\n' }Another step <Text style={{ color: c.orange }}>up.</Text></Text>
              <Text style={styles.heroCopy}>Your training deserves more than a log. Sage brings your workouts, progress and fitness challenges together — with a community to keep you moving.</Text>
              <View style={styles.actions}>
                <Link href="/(auth)/signup" style={styles.primaryLink}>Start your Sage journey →</Link>
                <Link href="/(auth)/login" style={styles.secondaryLink}>Already a member? Log in</Link>
              </View>
              <Text style={styles.caption}>Run · Ride · Swim · Strength · Train your way</Text>
            </View>
            <View style={[styles.heroArt, wide ? { width: 380 } : { width: '100%' }]}>
              <View style={styles.artHeading}><Text style={styles.overline}>THE SAGE JOURNEY</Text><SageIcon name="flag" color={c.orange} /></View>
              <Text style={styles.artTitle}>Your mountain awaits.</Text>
              <View style={{ height: 200, marginVertical: 22, borderRadius: 20, overflow: 'hidden' }}><MountainArt /></View>
              <View style={styles.journeyRow}>
                {([{ icon: 'activity', label: 'Train' }, { icon: 'check', label: 'Verify' }, { icon: 'mountain', label: 'Climb' }] as { icon: SageIconName; label: string }[]).map(step => (
                  <View key={step.label} style={styles.journeyStep}><View style={styles.iconCircle}><SageIcon name={step.icon} size={23} /></View><Text style={styles.stepLabel}>{step.label}</Text></View>
                ))}
              </View>
              <Text style={[styles.caption, { textAlign: 'center', marginTop: 20 }]}>Small efforts. A stronger you.</Text>
            </View>
          </View>

          <View style={styles.sectionIntro}>
            <Text style={styles.overline}>BUILT FOR THE LONG RUN</Text>
            <Text accessibilityRole="header" style={styles.sectionTitle}>One place for your next step.</Text>
            <Text style={styles.description}>From an indoor ride to an early morning run, turn the training you already do into a journey you can follow.</Text>
          </View>
          <View style={styles.featureGrid}>
            {features.map(feature => <View key={feature.title} style={[styles.featureCard, { width: wide ? '48%' : '100%' }]}>
              <View style={styles.iconCircle}><SageIcon name={feature.icon} size={24} /></View>
              <Text accessibilityRole="header" style={styles.cardTitle}>{feature.title}</Text>
              <Text style={styles.description}>{feature.description}</Text>
            </View>)}
          </View>

          <View style={styles.howSection}>
            <Text style={styles.overline}>HOW IT WORKS</Text>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Show up. Build momentum.</Text>
            <View style={[styles.steps, { flexDirection: wide ? 'row' : 'column' }]}>
              {[
                ['01', 'Find your starting point', 'Create your profile, share your sports and goals, and get your training level reviewed.'],
                ['02', 'Bring your training', 'Import from Apple Health or Health Connect, upload a .FIT workout or record a GPS session in the mobile app.'],
                ['03', 'Climb with your community', 'Join an eligible challenge. Approved workouts earn points under its rules and move you up the leaderboard.'],
              ].map(([number, title, body]) => <View key={number} style={styles.howStep}><Text style={styles.stepNumber}>{number}</Text><Text accessibilityRole="header" style={styles.cardTitle}>{title}</Text><Text style={styles.description}>{body}</Text></View>)}
            </View>
          </View>

          <View style={[styles.cta, wide && { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View style={{ flex: 1 }}><Text accessibilityRole="header" style={styles.ctaTitle}>The next step is yours.</Text><Text style={styles.ctaCopy}>Build your routine. Find your people. Start climbing.</Text></View>
            <Link href="/(auth)/signup" style={styles.primaryLink}>Join Sage →</Link>
          </View>
          <View style={styles.footer}>
            <Brand />
            <View style={styles.footerLinks}><Link href="/(auth)/login" style={styles.navLink}>Log in</Link><Link href="/privacy" style={styles.navLink}>Privacy policy</Link></View>
            <Text style={styles.caption}>Sage · Every workout. Another step up.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.bg },
  navBar: { backgroundColor: c.surface, borderBottomWidth: 1, borderColor: c.border },
  navInner: { width: '100%', maxWidth: 1140, alignSelf: 'center', paddingHorizontal: 22, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navLinks: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  navLink: { color: c.text, fontWeight: '600', fontSize: 13 },
  navButton: { backgroundColor: c.green, color: c.onAccent, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 12, overflow: 'hidden', fontSize: 13, fontWeight: '700' },
  scroll: { paddingBottom: 24 },
  content: { width: '100%', maxWidth: 1140, alignSelf: 'center', paddingHorizontal: 22 },
  hero: { paddingVertical: 48, gap: 36 },
  heroWide: { flexDirection: 'row', alignItems: 'center', paddingVertical: 76, gap: 50 },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, backgroundColor: c.pale, borderRadius: 30, paddingHorizontal: 13, paddingVertical: 9, marginBottom: 22 },
  badgeText: { color: c.green, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  headline: { color: c.text, fontWeight: '900', letterSpacing: -2 },
  heroCopy: { color: c.muted, fontSize: 17, lineHeight: 28, marginTop: 24, maxWidth: 530 },
  actions: { alignItems: 'flex-start', gap: 18, marginTop: 30 },
  primaryLink: { color: c.onAccent, backgroundColor: c.orange, paddingVertical: 17, paddingHorizontal: 22, borderRadius: 14, overflow: 'hidden', fontWeight: '800', fontSize: 14, alignSelf: 'flex-start' },
  secondaryLink: { color: c.green, fontSize: 13, fontWeight: '700' },
  caption: { color: c.muted, fontSize: 12, lineHeight: 19, marginTop: 24 },
  heroArt: { padding: 25, borderRadius: 28, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  artHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overline: { color: c.green, fontWeight: '800', fontSize: 10, letterSpacing: 1.5 },
  artTitle: { color: c.text, fontWeight: '800', fontSize: 23, marginTop: 13 },
  journeyRow: { flexDirection: 'row', justifyContent: 'space-around' },
  journeyStep: { alignItems: 'center', gap: 10 },
  iconCircle: { padding: 13, backgroundColor: c.pale, borderRadius: 16, alignSelf: 'flex-start' },
  stepLabel: { color: c.green, fontSize: 12, fontWeight: '700' },
  sectionIntro: { paddingTop: 24, paddingBottom: 28, maxWidth: 600 },
  sectionTitle: { color: c.text, fontSize: 32, lineHeight: 39, fontWeight: '800', letterSpacing: -1, marginTop: 12, marginBottom: 14 },
  description: { color: c.muted, fontSize: 14, lineHeight: 24 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 20 },
  featureCard: { backgroundColor: c.surface, borderRadius: 22, borderWidth: 1, borderColor: c.border, padding: 26 },
  cardTitle: { color: c.text, fontSize: 18, lineHeight: 25, fontWeight: '800', marginTop: 19, marginBottom: 10 },
  howSection: { paddingVertical: 60 },
  steps: { gap: 30, marginTop: 16 },
  howStep: { flex: 1 },
  stepNumber: { fontSize: 30, fontWeight: '800', color: c.orange },
  cta: { backgroundColor: c.green, borderRadius: 24, padding: 30, gap: 26 },
  ctaTitle: { color: c.onAccent, fontWeight: '800', fontSize: 28, lineHeight: 36 },
  ctaCopy: { color: c.onAccent, fontSize: 14, lineHeight: 23, marginTop: 10 },
  footer: { paddingTop: 44, paddingBottom: 18, gap: 20 },
  footerLinks: { flexDirection: 'row', gap: 24 },
});
