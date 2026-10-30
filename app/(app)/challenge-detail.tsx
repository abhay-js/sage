import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useProductChallenges, useAthleteProfile } from '../../hooks/useProduct';
import { Page, Header, Button, Empty, s } from '../../components/ui/AdventureUI';
import { TrailLandscape, AthleteIllustration } from '../../components/ui/AdventureArt';
import { Skeleton } from '../../components/ui/ProductUI';
import { ChallengeSections, Eligibility } from '../../components/ui/ChallengeContent';
import { challengeState } from '../../lib/productConfig';
import { adventureColors as c } from '../../lib/theme';

export default function ChallengeDetail() {
  const { id,tab } = useLocalSearchParams<{ id: string;tab?:string }>(), router = useRouter();
  const { data, loading, error, refresh } = useProductChallenges(), { data: profile } = useAthleteProfile();
  const challenge = data?.find(item => item.id === id);
  if(tab==='Rules')return <Redirect href={{pathname:'/(app)/challenge-rules',params:{id}}}/>;
  return <Page>
    <Header title={challenge?.name ?? 'Your next adventure'} eyebrow={challenge ? `${challengeState(challenge)} · ${challenge.config.challengeType}` : 'Challenge'} action={<TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={{ padding: 8 }}><Text style={{ color: c.orange, fontSize: 12, fontWeight: '700' }}>Back</Text></TouchableOpacity>} />
    {loading && !data ? <Skeleton /> : error ? <><Text accessibilityRole="alert" style={s.muted}>{error}</Text><Button title="Try again" onPress={refresh} /></> : challenge ? <>
      <View style={[s.card, { height: 180, marginBottom: 16, backgroundColor: c.sky }]}>{challenge.config.coverImageUrl ? <Image source={{ uri: challenge.config.coverImageUrl }} style={{ width: '100%', height: '100%' }} /> : <><TrailLandscape /><View style={{ position: 'absolute', bottom: 6, left: '42%' }}><AthleteIllustration current avatar={profile?.profile?.avatar} size={84} /></View></>}</View>
      <View style={[s.between, { gap: 12 }]}><Text style={s.muted}>{new Date(challenge.challenge_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {new Date(challenge.challenge_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text><Text style={[s.muted, { color: c.green }]}>{challenge.participant_count} {challenge.participant_count===1?'athlete':'athletes'}</Text></View>
      <Eligibility challenge={challenge} level={profile?.level ?? null} levels={profile?.levels ?? []} />
      <ChallengeSections initialTab={tab} challenge={challenge} onRefresh={refresh} />
    </> : <Empty text="This challenge is unavailable." />}
  </Page>;
}
