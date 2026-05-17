import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Alert, TextInput, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Race } from '../../types';

const SPORT_TYPES = ['Run', 'Ride', 'Swim', 'WeightTraining', 'Rowing', 'Hike', 'Walk', 'Yoga', 'CrossFit', 'Workout'];

const emptyForm = {
  name: '',
  city: '',
  race_date: '',
  challenge_start: '',
  challenge_end: '',
  sport_types: [] as string[],
  status: 'draft' as Race['status'],
};

interface Tip { id: string; content: string; sort_order: number }

export default function RacesScreen() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);

  // Race form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Tips modal
  const [tipsRace, setTipsRace] = useState<Race | null>(null);
  const [tips, setTips] = useState<Tip[]>([]);
  const [newTip, setNewTip] = useState('');
  const [tipSaving, setTipSaving] = useState(false);

  useEffect(() => { loadRaces(); }, []);

  async function loadRaces() {
    const { data } = await supabase.from('races').select('*').order('race_date', { ascending: false });
    setRaces(data ?? []);
    setLoading(false);
  }

  // ── Tips ──────────────────────────────────────────────────────────────────

  const loadTips = useCallback(async (raceId: string) => {
    const { data } = await supabase
      .from('race_tips')
      .select('*')
      .eq('race_id', raceId)
      .order('sort_order', { ascending: true });
    setTips(data ?? []);
  }, []);

  function openTips(race: Race) {
    setTipsRace(race);
    setNewTip('');
    loadTips(race.id);
  }

  async function addTip() {
    if (!newTip.trim() || !tipsRace) return;
    setTipSaving(true);
    const { error } = await supabase.from('race_tips').insert({
      race_id: tipsRace.id,
      content: newTip.trim(),
      sort_order: tips.length,
    });
    if (error) { Alert.alert('Error', error.message); }
    else { setNewTip(''); await loadTips(tipsRace.id); }
    setTipSaving(false);
  }

  async function deleteTip(tip: Tip) {
    Alert.alert('Delete tip?', tip.content.slice(0, 60), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('race_tips').delete().eq('id', tip.id);
          if (tipsRace) await loadTips(tipsRace.id);
        },
      },
    ]);
  }

  async function moveTip(tip: Tip, direction: 'up' | 'down') {
    const idx = tips.findIndex((t) => t.id === tip.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= tips.length) return;
    const swap = tips[swapIdx];
    await Promise.all([
      supabase.from('race_tips').update({ sort_order: swap.sort_order }).eq('id', tip.id),
      supabase.from('race_tips').update({ sort_order: tip.sort_order }).eq('id', swap.id),
    ]);
    if (tipsRace) await loadTips(tipsRace.id);
  }

  // ── Race form ─────────────────────────────────────────────────────────────

  function toggleSport(sport: string) {
    setForm((f) => ({
      ...f,
      sport_types: f.sport_types.includes(sport)
        ? f.sport_types.filter((s) => s !== sport)
        : [...f.sport_types, sport],
    }));
  }

  async function saveRace() {
    if (!form.name || !form.race_date || !form.challenge_start || !form.challenge_end || form.sport_types.length === 0) {
      Alert.alert('Missing fields', 'Fill in all required fields and pick at least one sport type.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('races').insert({
      name: form.name,
      city: form.city || null,
      race_date: form.race_date,
      challenge_start: form.challenge_start,
      challenge_end: form.challenge_end,
      sport_types: form.sport_types,
      status: form.status,
    });
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setShowForm(false);
    setForm(emptyForm);
    loadRaces();
  }

  async function updateStatus(race: Race, status: Race['status']) {
    await supabase.from('races').update({ status }).eq('id', race.id);
    loadRaces();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-sage-bg">
      <View className="px-4 pt-4 pb-2 flex-row justify-between items-center">
        <Text className="text-sage-text text-xl font-bold">Races</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} className="bg-sage-orange px-4 py-2 rounded-full">
          <Text className="text-black font-semibold text-sm">+ Add race</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={races}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <View className="bg-sage-surface border border-sage-border rounded-2xl p-4 mb-3">
            <View className="flex-row justify-between items-start mb-2">
              <Text className="text-sage-text font-semibold flex-1">{item.name}</Text>
              <View className={`px-2 py-0.5 rounded-full ml-2 ${
                item.status === 'open' ? 'bg-sage-green/20' :
                item.status === 'draft' ? 'bg-sage-orange/20' : 'bg-sage-surface'
              }`}>
                <Text className={`text-xs font-medium ${
                  item.status === 'open' ? 'text-sage-green' :
                  item.status === 'draft' ? 'text-sage-orange' : 'text-sage-muted'
                }`}>{item.status}</Text>
              </View>
            </View>

            <Text className="text-sage-muted text-xs mb-1">{item.city ?? ''}</Text>
            <Text className="text-sage-muted text-xs mb-1">
              Race: {new Date(item.race_date).toLocaleDateString('en-IN')}
            </Text>
            <Text className="text-sage-muted text-xs mb-2">
              Challenge: {new Date(item.challenge_start).toLocaleDateString('en-IN')} → {new Date(item.challenge_end).toLocaleDateString('en-IN')}
            </Text>

            <View className="flex-row flex-wrap gap-1 mb-3">
              {item.sport_types.map((s) => (
                <View key={s} className="bg-sage-bg px-2 py-0.5 rounded-full">
                  <Text className="text-sage-muted text-xs">{s}</Text>
                </View>
              ))}
            </View>

            <View className="flex-row gap-2 flex-wrap">
              {item.status !== 'open' && (
                <TouchableOpacity onPress={() => updateStatus(item, 'open')} className="bg-sage-green/20 px-3 py-1.5 rounded-full">
                  <Text className="text-sage-green text-xs font-medium">Open</Text>
                </TouchableOpacity>
              )}
              {item.status !== 'closed' && (
                <TouchableOpacity onPress={() => updateStatus(item, 'closed')} className="border border-sage-border px-3 py-1.5 rounded-full">
                  <Text className="text-sage-muted text-xs">Close</Text>
                </TouchableOpacity>
              )}
              {item.status !== 'draft' && (
                <TouchableOpacity onPress={() => updateStatus(item, 'draft')} className="border border-sage-border px-3 py-1.5 rounded-full">
                  <Text className="text-sage-muted text-xs">Draft</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => openTips(item)}
                className="bg-[#7c3aed]/20 border border-[#7c3aed]/30 px-3 py-1.5 rounded-full"
              >
                <Text style={{ color: '#a78bfa', fontSize: 12, fontWeight: '600' }}>💡 Tips</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading ? <Text className="text-sage-muted text-sm text-center py-8">No races yet.</Text> : null
        }
      />

      {/* ── Tips Modal ── */}
      <Modal visible={!!tipsRace} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-sage-bg">
          <SafeAreaView className="flex-1">
            <View className="px-4 pt-4 pb-2 flex-row justify-between items-center border-b border-[#1a1a1a]">
              <View>
                <Text className="text-sage-text text-lg font-bold">Tips</Text>
                <Text className="text-sage-muted text-xs mt-0.5" numberOfLines={1}>
                  {tipsRace?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTipsRace(null)} className="bg-sage-surface px-4 py-2 rounded-full">
                <Text className="text-sage-muted text-sm">Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-4 pt-4">
              {/* Add new tip */}
              <View className="bg-sage-surface rounded-2xl p-4 mb-4">
                <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mb-2">
                  Add tip
                </Text>
                <TextInput
                  value={newTip}
                  onChangeText={setNewTip}
                  placeholder="Enter a training tip for athletes…"
                  placeholderTextColor="#525252"
                  multiline
                  numberOfLines={3}
                  className="bg-sage-bg rounded-xl px-4 py-3 text-sage-text text-sm mb-3"
                  style={{ minHeight: 72, textAlignVertical: 'top' }}
                />
                <TouchableOpacity
                  onPress={addTip}
                  disabled={tipSaving || !newTip.trim()}
                  activeOpacity={0.8}
                  className="bg-sage-green rounded-xl py-3 items-center"
                  style={{ opacity: !newTip.trim() ? 0.4 : 1 }}
                >
                  <Text className="text-black font-bold text-sm">
                    {tipSaving ? 'Adding…' : '+ Add Tip'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Existing tips */}
              <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mb-3">
                {tips.length > 0 ? `${tips.length} tip${tips.length !== 1 ? 's' : ''}` : 'No tips yet'}
              </Text>

              {tips.map((tip, idx) => (
                <View key={tip.id} className="bg-sage-surface rounded-2xl p-4 mb-3">
                  <View className="flex-row items-start gap-3">
                    <Text className="text-sage-green font-black text-base leading-tight">#{idx + 1}</Text>
                    <Text className="text-sage-text text-sm leading-relaxed flex-1">{tip.content}</Text>
                  </View>
                  <View className="flex-row gap-2 mt-3 justify-end">
                    <TouchableOpacity
                      onPress={() => moveTip(tip, 'up')}
                      disabled={idx === 0}
                      activeOpacity={0.7}
                      className="bg-[#1f1f1f] px-3 py-1.5 rounded-full"
                      style={{ opacity: idx === 0 ? 0.3 : 1 }}
                    >
                      <Text className="text-sage-muted text-xs">↑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveTip(tip, 'down')}
                      disabled={idx === tips.length - 1}
                      activeOpacity={0.7}
                      className="bg-[#1f1f1f] px-3 py-1.5 rounded-full"
                      style={{ opacity: idx === tips.length - 1 ? 0.3 : 1 }}
                    >
                      <Text className="text-sage-muted text-xs">↓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteTip(tip)}
                      activeOpacity={0.7}
                      className="bg-red-500/15 border border-red-500/25 px-3 py-1.5 rounded-full"
                    >
                      <Text className="text-red-400 text-xs font-bold">Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {tips.length === 0 && (
                <View className="py-8 items-center">
                  <Text className="text-sage-muted text-sm text-center">
                    No custom tips yet.{'\n'}Athletes see sport-specific defaults until you add some.
                  </Text>
                </View>
              )}

              <View className="h-8" />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ── Add Race Modal ── */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-sage-bg">
          <SafeAreaView className="flex-1">
            <ScrollView className="flex-1 px-4 pt-4">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-sage-text text-xl font-bold">Add Race</Text>
                <TouchableOpacity onPress={() => setShowForm(false)}>
                  <Text className="text-sage-muted text-base">Cancel</Text>
                </TouchableOpacity>
              </View>

              {[
                { label: 'Race name *', key: 'name', placeholder: 'Mumbai Marathon 2026' },
                { label: 'City', key: 'city', placeholder: 'Mumbai' },
                { label: 'Race date * (YYYY-MM-DD)', key: 'race_date', placeholder: '2026-01-15' },
                { label: 'Challenge start * (YYYY-MM-DD)', key: 'challenge_start', placeholder: '2025-11-01' },
                { label: 'Challenge end * (YYYY-MM-DD)', key: 'challenge_end', placeholder: '2026-01-14' },
              ].map(({ label, key, placeholder }) => (
                <View key={key} className="mb-4">
                  <Text className="text-sage-muted text-xs mb-1">{label}</Text>
                  <TextInput
                    className="bg-sage-surface border border-sage-border text-sage-text rounded-xl px-4 py-3"
                    placeholder={placeholder}
                    placeholderTextColor="#737373"
                    value={(form as any)[key]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  />
                </View>
              ))}

              <Text className="text-sage-muted text-xs mb-2">Sport types *</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {SPORT_TYPES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => toggleSport(s)}
                    className={`px-3 py-1.5 rounded-full border ${
                      form.sport_types.includes(s)
                        ? 'bg-sage-green border-sage-green'
                        : 'bg-transparent border-sage-border'
                    }`}
                  >
                    <Text className={`text-sm ${form.sport_types.includes(s) ? 'text-black font-medium' : 'text-sage-muted'}`}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-sage-muted text-xs mb-2">Status</Text>
              <View className="flex-row gap-2 mb-8">
                {(['draft', 'open', 'closed'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setForm((f) => ({ ...f, status: s }))}
                    className={`px-4 py-2 rounded-full border ${form.status === s ? 'bg-sage-orange border-sage-orange' : 'bg-transparent border-sage-border'}`}
                  >
                    <Text className={`text-sm ${form.status === s ? 'text-black font-medium' : 'text-sage-muted'}`}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={saveRace}
                disabled={saving}
                className="bg-sage-orange rounded-xl py-3.5 items-center mb-8"
              >
                <Text className="text-black font-semibold text-base">
                  {saving ? 'Saving…' : 'Save race'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
