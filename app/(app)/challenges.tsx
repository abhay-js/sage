import { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useChallenges, useUserChallenges } from '../../hooks/useChallenges';
import { Challenge } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.7;

const SPORT_ICONS: Record<string, string> = {
  Run: '🏃',
  Ride: '🚴',
  Swim: '🏊',
  Trail: '🥾',
  Any: '⚡',
};

const DIFF_COLORS: Record<string, string> = {
  beginner: '#4ade80',
  intermediate: '#fb923c',
  elite: '#f87171',
};

function daysLeft(endDate: string): number {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function sportIcon(sport: string): string {
  return SPORT_ICONS[sport] ?? '⚡';
}

function diffColor(difficulty: string): string {
  return DIFF_COLORS[difficulty] ?? '#737373';
}

function ChallengeCard({
  challenge,
  joined,
  progress,
  onPress,
}: {
  challenge: Challenge;
  joined: boolean;
  progress?: number;
  onPress: () => void;
}) {
  const color = challenge.cover_color || '#4ade80';
  const dl = daysLeft(challenge.end_date);
  const dc = diffColor(challenge.difficulty);
  const icon = sportIcon(challenge.sport_type);
  const progressPct = progress != null ? Math.min(1, progress / challenge.target_value) : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        width: CARD_WIDTH,
        marginRight: 12,
        borderRadius: 16,
        backgroundColor: color + '18',
        borderWidth: 1,
        borderColor: color + '33',
        overflow: 'hidden',
        padding: 16,
        minHeight: 160,
      }}
    >
      <Text style={{ position: 'absolute', right: 8, top: 8, fontSize: 80, opacity: 0.15 }}>
        {icon}
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <View
          style={{
            backgroundColor: dc + '22',
            borderRadius: 20,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: dc + '44',
          }}
        >
          <Text style={{ color: dc, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>
            {challenge.difficulty.toUpperCase()}
          </Text>
        </View>
        {joined && (
          <View
            style={{
              backgroundColor: '#4ade8022',
              borderRadius: 20,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderWidth: 1,
              borderColor: '#4ade8044',
            }}
          >
            <Text style={{ color: '#4ade80', fontSize: 10, fontWeight: '800' }}>JOINED ✓</Text>
          </View>
        )}
      </View>

      <Text
        style={{ color: '#f5f5f5', fontSize: 18, fontWeight: '900', lineHeight: 22, marginBottom: 6 }}
        numberOfLines={2}
      >
        {challenge.title}
      </Text>

      <Text style={{ color: '#737373', fontSize: 12, fontWeight: '600', marginBottom: 12 }}>
        {challenge.target_value}{challenge.target_unit} · {dl}d left
      </Text>

      {joined && (
        <View style={{ marginBottom: 8 }}>
          <View
            style={{
              height: 3,
              backgroundColor: color + '22',
              borderRadius: 2,
              marginBottom: 4,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: 3,
                width: `${progressPct * 100}%`,
                backgroundColor: color,
                borderRadius: 2,
              }}
            />
          </View>
          {progress != null && (
            <Text style={{ color: '#737373', fontSize: 11, fontWeight: '600' }}>
              {progress.toFixed(1)} / {challenge.target_value}{challenge.target_unit}
            </Text>
          )}
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#737373', fontSize: 12, fontWeight: '600' }}>
          👥 {challenge.participant_count}
        </Text>
        {challenge.reward_title && (
          <Text style={{ color: '#737373', fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
            🏅 {challenge.reward_title}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function FeaturedCard({
  challenge,
  joined,
  onPress,
}: {
  challenge: Challenge;
  joined: boolean;
  onPress: () => void;
}) {
  const color = challenge.cover_color || '#4ade80';
  const dl = daysLeft(challenge.end_date);
  const icon = sportIcon(challenge.sport_type);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        marginHorizontal: 20,
        marginBottom: 12,
        borderRadius: 20,
        backgroundColor: color + '18',
        borderWidth: 1,
        borderColor: color + '33',
        overflow: 'hidden',
        padding: 20,
        minHeight: 180,
      }}
    >
      <Text
        style={{ position: 'absolute', right: 12, bottom: 12, fontSize: 110, opacity: 0.12 }}
      >
        {icon}
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <View
          style={{
            backgroundColor: '#ffcc0022',
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: '#ffcc0044',
          }}
        >
          <Text style={{ color: '#ffcc00', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
            ⭐ FEATURED
          </Text>
        </View>
        {challenge.is_brand_challenge && challenge.brand_name && (
          <View
            style={{
              backgroundColor: color + '22',
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: color + '44',
            }}
          >
            <Text style={{ color, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
              🏷 {challenge.brand_name.toUpperCase()}
            </Text>
          </View>
        )}
        {joined && (
          <View
            style={{
              backgroundColor: '#4ade8022',
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: '#4ade8044',
            }}
          >
            <Text style={{ color: '#4ade80', fontSize: 10, fontWeight: '800' }}>JOINED ✓</Text>
          </View>
        )}
      </View>

      <Text
        style={{ color: '#f5f5f5', fontSize: 28, fontWeight: '900', lineHeight: 32, marginBottom: 6 }}
        numberOfLines={2}
      >
        {challenge.title}
      </Text>

      {challenge.subtitle && (
        <Text
          style={{ color: '#a3a3a3', fontSize: 14, fontWeight: '500', marginBottom: 16 }}
          numberOfLines={2}
        >
          {challenge.subtitle}
        </Text>
      )}

      <View style={{ flexDirection: 'row', gap: 20 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#f5f5f5', fontSize: 16, fontWeight: '800' }}>
            {challenge.target_value}{challenge.target_unit}
          </Text>
          <Text style={{ color: '#737373', fontSize: 10, fontWeight: '600', marginTop: 2 }}>TARGET</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#f5f5f5', fontSize: 16, fontWeight: '800' }}>{dl}d</Text>
          <Text style={{ color: '#737373', fontSize: 10, fontWeight: '600', marginTop: 2 }}>LEFT</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#f5f5f5', fontSize: 16, fontWeight: '800' }}>
            {challenge.participant_count}
          </Text>
          <Text style={{ color: '#737373', fontSize: 10, fontWeight: '600', marginTop: 2 }}>ATHLETES</Text>
        </View>
        {challenge.reward_title && (
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ color: '#f5f5f5', fontSize: 16, fontWeight: '800' }}>🏅</Text>
            <Text
              style={{ color: '#737373', fontSize: 10, fontWeight: '600', marginTop: 2 }}
              numberOfLines={1}
            >
              REWARD
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <Text
      style={{
        color: '#737373',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        paddingHorizontal: 20,
        marginBottom: 12,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Text>
  );
}

function HorizontalSection({
  label,
  challenges,
  joinedIds,
  onPress,
}: {
  label: string;
  challenges: Challenge[];
  joinedIds: Set<string>;
  onPress: (id: string) => void;
}) {
  if (challenges.length === 0) return null;
  return (
    <View style={{ marginBottom: 28 }}>
      <SectionHeader label={label} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingRight: 8 }}
      >
        {challenges.map((c) => (
          <ChallengeCard
            key={c.id}
            challenge={c}
            joined={joinedIds.has(c.id)}
            onPress={() => onPress(c.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export default function ChallengesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { challenges, loading, refetch } = useChallenges();
  const { challenges: userChallenges, refetch: refetchUser } = useUserChallenges(user?.id);
  const firstName = user?.name?.split(' ')[0] ?? 'Athlete';

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchUser();
    }, [refetch, refetchUser])
  );

  const joinedIds = new Set(userChallenges.map((c) => c.id));

  const featured = challenges.filter((c) => c.category === 'featured');
  const trending = challenges.filter((c) => c.category === 'trending' || c.participant_count > 10);
  const brand = challenges.filter((c) => c.is_brand_challenge);
  const beginnerFriendly = challenges.filter((c) => c.difficulty === 'beginner');
  const elite = challenges.filter((c) => c.difficulty === 'elite');

  const noContent = !loading && challenges.length === 0;

  function goToDetail(id: string) {
    router.push({ pathname: '/(app)/challenge-detail', params: { id } });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 }}>
          <Text style={{ color: '#737373', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 4 }}>
            {firstName.toUpperCase()}
          </Text>
          <Text style={{ color: '#f5f5f5', fontSize: 34, fontWeight: '900', letterSpacing: -0.5 }}>
            Challenges
          </Text>
        </View>

        {loading && (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator color="#4ade80" />
          </View>
        )}

        {noContent && (
          <View style={{ paddingVertical: 80, alignItems: 'center', paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🎯</Text>
            <Text style={{ color: '#f5f5f5', fontSize: 20, fontWeight: '800', marginBottom: 8 }}>
              No challenges yet
            </Text>
            <Text style={{ color: '#737373', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              Check back soon. New challenges drop every week.
            </Text>
          </View>
        )}

        {featured.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <SectionHeader label="⭐ Featured" />
            {featured.map((c) => (
              <FeaturedCard
                key={c.id}
                challenge={c}
                joined={joinedIds.has(c.id)}
                onPress={() => goToDetail(c.id)}
              />
            ))}
          </View>
        )}

        {userChallenges.length > 0 && (
          <HorizontalSection
            label="🔥 Your Active"
            challenges={userChallenges}
            joinedIds={joinedIds}
            onPress={goToDetail}
          />
        )}

        {trending.length > 0 && (
          <HorizontalSection
            label="🔥 Trending"
            challenges={trending}
            joinedIds={joinedIds}
            onPress={goToDetail}
          />
        )}

        {brand.length > 0 && (
          <HorizontalSection
            label="🏷 Brand Challenges"
            challenges={brand}
            joinedIds={joinedIds}
            onPress={goToDetail}
          />
        )}

        {beginnerFriendly.length > 0 && (
          <HorizontalSection
            label="💫 Beginner Friendly"
            challenges={beginnerFriendly}
            joinedIds={joinedIds}
            onPress={goToDetail}
          />
        )}

        {elite.length > 0 && (
          <HorizontalSection
            label="👑 Elite"
            challenges={elite}
            joinedIds={joinedIds}
            onPress={goToDetail}
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
