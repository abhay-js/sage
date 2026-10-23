import { Link } from 'expo-router';
import Head from 'expo-router/head';
import { StyleSheet, Text, View } from 'react-native';
import { Brand, Page, s } from '../components/ui/SageUI';
import { sageColors as c } from '../lib/theme';
import { privacyPolicyUpdated, privacySections } from '../lib/privacyPolicy';

export default function PrivacyPolicyScreen() {
  return (
    <Page>
      <Head>
        <title>Sage Privacy Policy</title>
        <meta name="description" content="How Sage handles account information, workout and health data, GPS routes, uploaded files and privacy requests." />
      </Head>
      <Brand />
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={s.eyebrow}>YOUR DATA & YOUR CHOICES</Text>
        <Text accessibilityRole="header" style={s.title}>Privacy policy</Text>
        <Text style={[s.muted, { marginTop: 10 }]}>Last updated: {privacyPolicyUpdated}</Text>
      </View>
      <View style={[s.card, s.body, { marginBottom: 12 }]}>
        <Text selectable style={styles.body}>Workout imports and GPS recording are optional. Submitted activity evidence can be reviewed by Sage administrators. You can revoke device permissions and request deletion of stored data.</Text>
      </View>
      {privacySections.map((section, index) => (
        <View key={section.title} style={styles.section}>
          <Text accessibilityRole="header" style={[s.section, { marginBottom: 10 }]}>{index + 1}. {section.title}</Text>
          {section.paragraphs.map(paragraph => <Text key={paragraph} selectable style={styles.body}>{paragraph}</Text>)}
        </View>
      ))}
      <Link href="/" style={styles.link}>Return to Sage</Link>
    </Page>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: 32, marginBottom: 24 },
  section: { paddingVertical: 20, borderBottomWidth: 1, borderColor: c.border },
  body: { color: c.text, fontSize: 14, lineHeight: 23, marginBottom: 12 },
  link: { color: c.orange, fontWeight: '700', marginTop: 28, textDecorationLine: 'underline' },
});
