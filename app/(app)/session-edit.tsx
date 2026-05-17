import { useState, useEffect, ReactNode } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, TextInputProps, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LocationPicker } from '../../components/LocationPicker';
import { DatePickerField } from '../../components/DatePickerField';

const SPORT_ICONS: Record<string, string> = { Ride: '🚴', Run: '🏃', Swim: '🏊', Trail: '🥾' };

const RIDE_TYPES = ['recovery', 'endurance', 'tempo', 'race_pace', 'climbing', 'social'] as const;
const RIDE_TYPE_LABELS: Record<string, string> = {
  recovery: 'Recovery', endurance: 'Endurance', tempo: 'Tempo',
  race_pace: 'Race Pace', climbing: 'Climbing', social: 'Social',
};
const RUN_SURFACES = ['road', 'trail', 'track'] as const;
const RUN_WORKOUT_TYPES = ['easy', 'long', 'intervals', 'tempo', 'race_simulation'] as const;
const RUN_TYPE_LABELS: Record<string, string> = {
  easy: 'Easy Run', long: 'Long Run', intervals: 'Intervals',
  tempo: 'Tempo', race_simulation: 'Race Sim',
};

export default function SessionEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  // Core
  const [sport, setSport] = useState('Ride');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [timeDate, setTimeDate] = useState<Date>(() => { const d = new Date(); d.setHours(6, 30, 0, 0); return d; });
  const [meetingPoint, setMeetingPoint] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [routeLink, setRouteLink] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [durationMins, setDurationMins] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('20');
  const [whatsappLink, setWhatsappLink] = useState('');
  // Cycling
  const [minFtp, setMinFtp] = useState('');
  const [avgSpeedKmh, setAvgSpeedKmh] = useState('');
  const [elevationGainM, setElevationGainM] = useState('');
  const [rideType, setRideType] = useState('');
  // Running
  const [minPace, setMinPace] = useState('');
  const [surfaceType, setSurfaceType] = useState('');
  const [workoutType, setWorkoutType] = useState('');

  useEffect(() => {
    if (!id) return;
    supabase.from('group_sessions').select('*').eq('id', id).single().then(({ data: s }) => {
      if (!s) { setFetching(false); return; }
      setSport(s.sport_type);
      setTitle(s.title);
      setDescription(s.description ?? '');
      setDate(new Date(s.session_date + 'T00:00:00'));
      const [hh, mm] = s.start_time.slice(0, 5).split(':').map(Number);
      const td = new Date(); td.setHours(hh, mm, 0, 0); setTimeDate(td);
      setMeetingPoint(s.meeting_point ?? '');
      setLatitude(s.latitude ?? null);
      setLongitude(s.longitude ?? null);
      setRouteLink(s.route_link ?? '');
      setDistanceKm(s.distance_km != null ? String(s.distance_km) : '');
      setDurationMins(s.duration_mins != null ? String(s.duration_mins) : '');
      setMaxParticipants(String(s.max_participants));
      setWhatsappLink(s.whatsapp_link ?? '');
      setMinFtp(s.min_ftp != null ? String(s.min_ftp) : '');
      setAvgSpeedKmh(s.avg_speed_kmh != null ? String(s.avg_speed_kmh) : '');
      setElevationGainM(s.elevation_gain_m != null ? String(s.elevation_gain_m) : '');
      setRideType(s.ride_type ?? '');
      setMinPace(s.min_pace ?? '');
      setSurfaceType(s.surface_type ?? '');
      setWorkoutType(s.workout_type ?? '');
      setFetching(false);
    });
  }, [id]);

  async function save() {
    if (!title.trim()) { Alert.alert('Missing', 'Title is required.'); return; }
    const timeStr = `${String(timeDate.getHours()).padStart(2, '0')}:${String(timeDate.getMinutes()).padStart(2, '0')}`;
    setSaving(true);
    const { error } = await supabase.from('group_sessions').update({
      title: title.trim(),
      description: description.trim() || null,
      sport_type: sport,
      session_date: date.toISOString().split('T')[0],
      start_time: timeStr + ':00',
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      map_link: latitude && longitude
        ? `https://maps.google.com/?q=${latitude},${longitude}`
        : null,
      meeting_point: meetingPoint.trim() || null,
      route_link: routeLink.trim() || null,
      distance_km: distanceKm ? parseFloat(distanceKm) : null,
      duration_mins: durationMins ? parseInt(durationMins) : null,
      max_participants: parseInt(maxParticipants) || 20,
      whatsapp_link: whatsappLink.trim() || null,
      min_ftp: minFtp ? parseInt(minFtp) : null,
      avg_speed_kmh: avgSpeedKmh ? parseFloat(avgSpeedKmh) : null,
      elevation_gain_m: elevationGainM ? parseInt(elevationGainM) : null,
      ride_type: rideType || null,
      min_pace: minPace.trim() || null,
      surface_type: surfaceType || null,
      workout_type: workoutType || null,
    }).eq('id', id!);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('Saved!', 'Session updated.', [{ text: 'OK', onPress: () => router.back() }]);
  }

  if (fetching) {
    return (
      <SafeAreaView className="flex-1 bg-sage-bg items-center justify-center">
        <ActivityIndicator color="#4ade80" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-sage-bg">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-5 pt-4">
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} className="mb-4">
              <Text className="text-sage-muted text-sm font-bold">← Back</Text>
            </TouchableOpacity>
            <Text className="text-sage-text text-2xl font-black mb-6">Edit Session</Text>
          </View>

          <View className="px-5 gap-4">
            {/* Sport */}
            <Section label="Sport">
              <View className="flex-row gap-2">
                {(['Ride', 'Run', 'Swim', 'Trail'] as const).map((s) => (
                  <TouchableOpacity
                    key={s} onPress={() => setSport(s)} activeOpacity={0.8}
                    className={`flex-1 py-3 rounded-xl items-center ${sport === s ? 'bg-sage-green' : 'bg-sage-surface'}`}
                  >
                    <Text style={{ fontSize: 18 }}>{SPORT_ICONS[s]}</Text>
                    <Text className={`text-xs font-bold mt-1 ${sport === s ? 'text-black' : 'text-sage-muted'}`}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Section>

            <Section label="Title *">
              <Input value={title} onChangeText={setTitle} placeholder="Session title" maxLength={60} />
            </Section>

            <Section label="Description">
              <Input value={description} onChangeText={setDescription} placeholder="Details…" multiline numberOfLines={3} style={{ minHeight: 72, textAlignVertical: 'top' }} />
            </Section>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Section label="Date *">
                  <DatePickerField value={date} onChange={setDate} mode="date" minimumDate={new Date()} />
                </Section>
              </View>
              <View className="flex-1">
                <Section label="Start time *">
                  <DatePickerField value={timeDate} onChange={setTimeDate} mode="time" />
                </Section>
              </View>
            </View>

            <Section label="Start location">
              <LocationPicker
                address={meetingPoint}
                latitude={latitude}
                longitude={longitude}
                onChange={(addr, lat, lng) => {
                  setMeetingPoint(addr);
                  setLatitude(lat);
                  setLongitude(lng);
                }}
              />
            </Section>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Section label="Distance (km)">
                  <Input value={distanceKm} onChangeText={setDistanceKm} placeholder="60" keyboardType="decimal-pad" />
                </Section>
              </View>
              <View className="flex-1">
                <Section label="Duration (min)">
                  <Input value={durationMins} onChangeText={setDurationMins} placeholder="120" keyboardType="number-pad" />
                </Section>
              </View>
            </View>

            <Section label="Max participants">
              <Input value={maxParticipants} onChangeText={setMaxParticipants} placeholder="20" keyboardType="number-pad" />
            </Section>

            {/* Cycling specific */}
            {sport === 'Ride' && (
              <>
                <Section label="Ride type">
                  <View className="flex-row flex-wrap gap-2">
                    {RIDE_TYPES.map((rt) => (
                      <TouchableOpacity
                        key={rt} onPress={() => setRideType(rideType === rt ? '' : rt)} activeOpacity={0.8}
                        className={`px-3 py-1.5 rounded-full border ${rideType === rt ? 'border-sage-green bg-sage-green/10' : 'border-[#2a2a2a] bg-sage-surface'}`}
                      >
                        <Text className={`text-xs font-bold ${rideType === rt ? 'text-sage-green' : 'text-sage-muted'}`}>
                          {RIDE_TYPE_LABELS[rt]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Section>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Section label="Min FTP (W)">
                      <Input value={minFtp} onChangeText={setMinFtp} placeholder="200" keyboardType="number-pad" />
                    </Section>
                  </View>
                  <View className="flex-1">
                    <Section label="Avg speed (km/h)">
                      <Input value={avgSpeedKmh} onChangeText={setAvgSpeedKmh} placeholder="28" keyboardType="decimal-pad" />
                    </Section>
                  </View>
                </View>
                <Section label="Elevation gain (m)">
                  <Input value={elevationGainM} onChangeText={setElevationGainM} placeholder="800" keyboardType="number-pad" />
                </Section>
              </>
            )}

            {/* Running specific */}
            {sport === 'Run' && (
              <>
                <Section label="Workout type">
                  <View className="flex-row flex-wrap gap-2">
                    {RUN_WORKOUT_TYPES.map((wt) => (
                      <TouchableOpacity
                        key={wt} onPress={() => setWorkoutType(workoutType === wt ? '' : wt)} activeOpacity={0.8}
                        className={`px-3 py-1.5 rounded-full border ${workoutType === wt ? 'border-sage-green bg-sage-green/10' : 'border-[#2a2a2a] bg-sage-surface'}`}
                      >
                        <Text className={`text-xs font-bold ${workoutType === wt ? 'text-sage-green' : 'text-sage-muted'}`}>
                          {RUN_TYPE_LABELS[wt]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Section>
                <Section label="Surface">
                  <View className="flex-row gap-2">
                    {RUN_SURFACES.map((s) => (
                      <TouchableOpacity
                        key={s} onPress={() => setSurfaceType(surfaceType === s ? '' : s)} activeOpacity={0.8}
                        className={`flex-1 py-2.5 rounded-xl items-center border ${surfaceType === s ? 'border-sage-green bg-sage-green/10' : 'border-transparent bg-sage-surface'}`}
                      >
                        <Text className={`text-xs font-bold capitalize ${surfaceType === s ? 'text-sage-green' : 'text-sage-muted'}`}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Section>
                <Section label="Min pace (e.g. 5:30)">
                  <Input value={minPace} onChangeText={setMinPace} placeholder="5:30" keyboardType="numbers-and-punctuation" maxLength={8} />
                </Section>
              </>
            )}

            <Section label="Route link (optional)">
              <Input value={routeLink} onChangeText={setRouteLink} placeholder="Strava / Komoot URL" keyboardType="url" autoCapitalize="none" />
            </Section>

            <Section label="WhatsApp group link (optional)">
              <Input value={whatsappLink} onChangeText={setWhatsappLink} placeholder="https://chat.whatsapp.com/..." keyboardType="url" autoCapitalize="none" />
            </Section>

            <TouchableOpacity
              onPress={save} disabled={saving} activeOpacity={0.85}
              className="bg-sage-green rounded-2xl py-4 items-center mt-2 mb-10"
            >
              <Text className="text-black font-black text-base tracking-widest">
                {saving ? 'SAVING…' : 'SAVE CHANGES →'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mb-2">{label}</Text>
      {children}
    </View>
  );
}

function Input({ style, ...props }: TextInputProps & { style?: object }) {
  return (
    <TextInput
      className="bg-sage-surface rounded-xl px-4 py-3 text-sage-text text-sm"
      placeholderTextColor="#525252"
      style={style}
      {...props}
    />
  );
}
