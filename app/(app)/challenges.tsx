import { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useProductChallenges, useAthleteProfile } from '../../hooks/useProduct';
import { Page, Header, Section, Empty, Button, Chips, s } from '../../components/ui/AdventureUI';
import { TrailLandscape, AthleteIllustration } from '../../components/ui/AdventureArt';
import { SageIcon } from '../../components/ui/SageIcon';
import { Skeleton } from '../../components/ui/ProductUI';
import { challengeState, levelName } from '../../lib/productConfig';
import { adventureColors as c } from '../../lib/theme';

export default function ChallengesScreen() {
  const router = useRouter(), { data, loading, error, refresh } = useProductChallenges(), { data: profile } = useAthleteProfile();
  const [filter, setFilter] = useState('All');
  const visible = (data ?? []).filter(ch => filter === 'All' || ch.sport_types.includes(filter));
  return <Page>
    <Header title="Choose your adventure." eyebrow="A little effort. A big adventure." />
    <Text style={[s.muted, { marginBottom: 20 }]}>Find your people. Make your next workout count.</Text>
    <Chips options={['All','Run','Ride','Swim','WeightTraining','CrossFit'].map(id => ({ id, label: id === 'WeightTraining' ? 'Strength' : id === 'CrossFit' ? 'HYROX' : id }))} value={filter} onChange={setFilter} />
    {error && <View style={{ gap: 12 }}><Text accessibilityRole="alert" style={s.muted}>{error}</Text><Button title="Try again" onPress={refresh} /></View>}
    {loading && !data ? <Skeleton /> : !visible.length ? <Empty text={data?.length ? 'No challenges for this sport yet. Try another sport.' : 'Your next adventure is on its way. Check back for new challenges.'} /> : ['Live','Upcoming','Completed'].map(state => {
      const rows = visible.filter(ch => challengeState(ch) === state);
      return rows.length ? <View key={state}><Section title={state === 'Live' ? 'Your next climb' : state} />{rows.map(ch => <View key={ch.id} style={[s.card, { marginBottom: 18 }]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`View ${ch.name}`} onPress={() => router.push({ pathname: '/(app)/challenge-detail', params: { id: ch.id } })}>
          <View style={{ height: 155, backgroundColor: c.sky, overflow: 'hidden' }}>{ch.config.coverImageUrl ? <Image source={{ uri: ch.config.coverImageUrl }} style={{ width: '100%', height: '100%' }} /> : <><TrailLandscape /><View style={{ position: 'absolute', bottom: 5, left: '44%' }}><AthleteIllustration current avatar={profile?.profile?.avatar} size={65} /></View></>}
            <View style={{ position: 'absolute', top: 12, left: 14, backgroundColor: c.surface, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}><Text style={{ fontSize: 9, fontWeight: '800', color: state === 'Live' ? c.orange : c.green }}>{state === 'Live' ? '● LIVE ADVENTURE' : state.toUpperCase()}</Text></View>
          </View>
          <View style={{ padding: 18 }}>
            <Text style={s.eyebrow}>{ch.config.challengeType}</Text><View style={[s.between, { gap: 12 }]}><Text style={[s.title, { fontSize: 23, flex: 1 }]}>{ch.name}</Text><SageIcon name="arrow" size={20} color={c.orange} /></View>
            <Text numberOfLines={2} style={[s.muted, { marginTop: 5 }]}>{ch.config.description || 'Every workout is another step toward your summit.'}</Text>
            <View style={[s.between, { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.border, gap: 10 }]}><Text style={[s.muted, { fontSize: 10, flex: 1 }]}>{ch.participant_count} athletes · {ch.sport_types.map(sport => sport === 'WeightTraining' ? 'Strength' : sport).join(' / ')}</Text><Text style={{ color: c.green, fontWeight: '700', fontSize: 10 }}>{new Date(ch.challenge_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text></View>
            <Text style={{ color: ch.joined || ch.eligibility === 'ELIGIBLE' ? c.green : c.muted, fontSize: 11, marginTop: 10, fontWeight: '700' }}>{state === 'Completed' ? (ch.joined ? `Finished · ${ch.sage_score} pts` : 'This adventure has finished') : ch.joined ? `You're in${ch.rank ? ` · #${ch.rank}` : ''} · ${ch.sage_score} pts` : ch.eligibility === 'ELIGIBLE' ? "You're eligible. Your adventure starts here." : ch.eligibility === 'PENDING_LEVEL_REVIEW' ? 'Your athlete level is under review' : ch.eligible_levels.map(l => levelName(l, profile?.levels ?? [])).join(' + ')}</Text>
          </View>
        </TouchableOpacity>
        {ch.joined && <View style={{ padding: 14, paddingTop: 0 }}><Button secondary title="See your climb" icon="mountain" onPress={() => router.push({ pathname: '/(app)/ranks', params: { raceId: ch.id } })} /></View>}
      </View>)}</View> : null;
    })}
  </Page>;
}
