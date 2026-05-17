import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Entry, User } from '../types';
import { AthleteSheet } from './AthleteSheet';

type SortKey = 'sage_score' | 'sessions' | 'total_hours' | 'streak';

interface Props {
  rank: number;
  user: Pick<User, 'id' | 'name'>;
  entry: Entry;
  isMe?: boolean;
  sortKey?: SortKey;
}

const TOP3: Record<number, { emoji: string; textColor: string; avatarBg: string }> = {
  1: { emoji: '🥇', textColor: 'text-yellow-400', avatarBg: 'bg-yellow-400/20' },
  2: { emoji: '🥈', textColor: 'text-zinc-300', avatarBg: 'bg-zinc-400/20' },
  3: { emoji: '🥉', textColor: 'text-amber-500', avatarBg: 'bg-amber-500/20' },
};

const SORT_DISPLAY: Record<SortKey, { getValue: (e: Entry) => string; label: string }> = {
  sage_score: { getValue: (e) => e.sage_score.toLocaleString(), label: 'PTS' },
  sessions:   { getValue: (e) => String(e.sessions),            label: 'SESS' },
  total_hours:{ getValue: (e) => e.total_hours.toFixed(1),      label: 'HRS' },
  streak:     { getValue: (e) => `${e.streak}🔥`,               label: 'STREAK' },
};

export function LeaderboardRow({ rank, user, entry, isMe, sortKey = 'sage_score' }: Props) {
  const [sheetUserId, setSheetUserId] = useState<string | null>(null);
  const initials = user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const cfg = TOP3[rank];

  return (
    <>
      <TouchableOpacity
        onPress={() => setSheetUserId(user.id)}
        activeOpacity={0.75}
        className={`flex-row items-center px-5 py-3.5 ${
          isMe ? 'bg-sage-green/10 mx-4 rounded-2xl mb-1' : 'border-b border-[#141414]'
        }`}
      >
        {/* Rank / medal */}
        <View className="w-9 items-center">
          {cfg ? (
            <Text style={{ fontSize: 18 }}>{cfg.emoji}</Text>
          ) : (
            <Text className={`text-sm font-black ${isMe ? 'text-sage-green' : 'text-sage-muted'}`}>
              #{rank}
            </Text>
          )}
        </View>

        {/* Avatar */}
        <View
          className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
            cfg ? cfg.avatarBg : isMe ? 'bg-sage-green/20' : 'bg-sage-surface'
          }`}
        >
          <Text className={`text-xs font-black ${cfg ? cfg.textColor : isMe ? 'text-sage-green' : 'text-sage-muted'}`}>
            {initials}
          </Text>
        </View>

        {/* Name + streak */}
        <View className="flex-1">
          <Text className={`font-bold text-sm ${isMe ? 'text-sage-green' : 'text-sage-text'}`}>
            {user.name}
          </Text>
          {entry.streak > 0 && (
            <Text className="text-sage-muted text-xs">🔥 {entry.streak}d streak</Text>
          )}
        </View>

        {/* Score / stat */}
        <View className="items-end">
          <Text
            className={`font-black text-base ${
              cfg ? cfg.textColor : isMe ? 'text-sage-green' : 'text-sage-text'
            }`}
          >
            {SORT_DISPLAY[sortKey].getValue(entry)}
          </Text>
          <Text className="text-sage-muted text-[9px] font-bold tracking-widest">
            {SORT_DISPLAY[sortKey].label}
          </Text>
        </View>
      </TouchableOpacity>

      <AthleteSheet userId={sheetUserId} onClose={() => setSheetUserId(null)} />
    </>
  );
}
