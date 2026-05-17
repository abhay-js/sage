import { useState, ReactNode } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
  TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { LocationPicker } from '../../components/LocationPicker';
import { DatePickerField } from '../../components/DatePickerField';

const SPORT_TYPES = ['Ride', 'Run', 'Swim', 'Trail'] as const;
type SportType = typeof SPORT_TYPES[number];

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

const SPORT_ICONS: Record<string, string> = {
  Ride: '🚴', Run: '🏃', Swim: '🏊', Trail: '🥾',
};

export default function SessionCreateScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Core fields
  const [sport, setSport] = useState<SportType>('Ride');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [timeDate, setTimeDate] = useState<Date>(() => { const d = new Date(); d.setHours(6, 30, 0, 0); return d; });
  const [meetingPoint, setMeetingPoint] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [routeLink, setRouteLink] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [durationMins, setDurationMins] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('20');
  const [whatsappLink, setWhatsappLink] = useState('');

  // Cycling specific
  const [minFtp, setMinFtp] = useState('');
  const [avgSpeedKmh, setAvgSpeedKmh] = useState('');
  const [elevationGainM, setElevationGainM] = useState('');
  const [rideType, setRideType] = useState<string>('');

  // Running specific
  const [minPace, setMinPace] = useState(''); // e.g. "5:30"
  const [surfaceType, setSurfaceType] = useState<string>('');
  const [workoutType, setWorkoutType] = useState<string>('');

  async function submit() {
    if (!user) return;
    if (!title.trim()) { Alert.alert('Missing info', 'Please add a title.'); return; }

    const dateStr = date.toISOString().split('T')[0];
    const timeStr = `${String(timeDate.getHours()).padStart(2, '0')}:${String(timeDate.getMinutes()).padStart(2, '0')}`;

    setLoading(true);
    const { error } = await supabase.from('group_sessions').insert({
      host_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      sport_type: sport,
      session_date: dateStr,
      start_time: timeStr + ':00',
      meeting_point: meetingPoint.trim() || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      map_link: latitude && longitude
        ? `https://maps.google.com/?q=${latitude},${longitude}`
        : null,
      route_link: routeLink.trim() || null,
      distance_km: distanceKm ? parseFloat(distanceKm) : null,
      duration_mins: durationMins ? parseInt(durationMins) : null,
      max_participants: parseInt(maxParticipants) || 20,
      current_count: 0,
      whatsapp_link: whatsappLink.trim() || null,
      visibility: 'public',
      status: 'open',
      // Cycling
      min_ftp: minFtp ? parseInt(minFtp) : null,
      avg_speed_kmh: avgSpeedKmh ? parseFloat(avgSpeedKmh) : null,
      elevation_gain_m: elevationGainM ? parseInt(elevationGainM) : null,
      ride_type: rideType || null,
      // Running
      min_pace: minPace.trim() || null,
      surface_type: surfaceType || null,
      workout_type: workoutType || null,
    });
    setLoading(false);

    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('Session created!', 'Athletes can now find and join your session.', [
      { text: 'Done', onPress: () => router.back() },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-sage-bg">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-5 pt-4">
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} className="mb-4">
              <Text className="text-sage-muted text-sm font-bold">← Back</Text>
            </TouchableOpacity>
            <Text className="text-sage-text text-2xl font-black mb-6">Host a Session</Text>
          </View>

          <View className="px-5 gap-4">
            {/* Sport selector */}
            <Section label="Sport">
              <View className="flex-row gap-2">
                {SPORT_TYPES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setSport(s)}
                    activeOpacity={0.8}
                    className={`flex-1 py-3 rounded-xl items-center ${
                      sport === s ? 'bg-sage-green' : 'bg-sage-surface'
                    }`}
                  >
                    <Text style={{ fontSize: 18 }}>{SPORT_ICONS[s]}</Text>
                    <Text
                      className={`text-xs font-bold mt-1 ${
                        sport === s ? 'text-black' : 'text-sage-muted'
                      }`}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Section>

            {/* Title */}
            <Section label="Title *">
              <Input
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Morning Tempo Ride"
                maxLength={60}
              />
            </Section>

            {/* Description */}
            <Section label="Description">
              <Input
                value={description}
                onChangeText={setDescription}
                placeholder="Pace, vibe, what to bring…"
                multiline
                numberOfLines={3}
                style={{ minHeight: 72, textAlignVertical: 'top' }}
              />
            </Section>

            {/* Date & Time */}
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

            {/* Meeting point */}
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

            {/* Distance & Duration */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Section label="Distance (km)">
                  <Input
                    value={distanceKm}
                    onChangeText={setDistanceKm}
                    placeholder="60"
                    keyboardType="decimal-pad"
                  />
                </Section>
              </View>
              <View className="flex-1">
                <Section label="Duration (min)">
                  <Input
                    value={durationMins}
                    onChangeText={setDurationMins}
                    placeholder="120"
                    keyboardType="number-pad"
                  />
                </Section>
              </View>
            </View>

            {/* Max participants */}
            <Section label="Max participants">
              <Input
                value={maxParticipants}
                onChangeText={setMaxParticipants}
                placeholder="20"
                keyboardType="number-pad"
              />
            </Section>

            {/* Cycling-specific */}
            {sport === 'Ride' && (
              <>
                <Section label="Ride type">
                  <View className="flex-row flex-wrap gap-2">
                    {RIDE_TYPES.map((rt) => (
                      <TouchableOpacity
                        key={rt}
                        onPress={() => setRideType(rideType === rt ? '' : rt)}
                        activeOpacity={0.8}
                        className={`px-3 py-1.5 rounded-full border ${
                          rideType === rt
                            ? 'border-sage-green bg-sage-green/10'
                            : 'border-[#2a2a2a] bg-sage-surface'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            rideType === rt ? 'text-sage-green' : 'text-sage-muted'
                          }`}
                        >
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

            {/* Running-specific */}
            {sport === 'Run' && (
              <>
                <Section label="Workout type">
                  <View className="flex-row flex-wrap gap-2">
                    {RUN_WORKOUT_TYPES.map((wt) => (
                      <TouchableOpacity
                        key={wt}
                        onPress={() => setWorkoutType(workoutType === wt ? '' : wt)}
                        activeOpacity={0.8}
                        className={`px-3 py-1.5 rounded-full border ${
                          workoutType === wt
                            ? 'border-sage-green bg-sage-green/10'
                            : 'border-[#2a2a2a] bg-sage-surface'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            workoutType === wt ? 'text-sage-green' : 'text-sage-muted'
                          }`}
                        >
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
                        key={s}
                        onPress={() => setSurfaceType(surfaceType === s ? '' : s)}
                        activeOpacity={0.8}
                        className={`flex-1 py-2.5 rounded-xl items-center border ${
                          surfaceType === s
                            ? 'border-sage-green bg-sage-green/10'
                            : 'border-transparent bg-sage-surface'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold capitalize ${
                            surfaceType === s ? 'text-sage-green' : 'text-sage-muted'
                          }`}
                        >
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Section>

                <Section label="Min pace (e.g. 5:30)">
                  <Input
                    value={minPace}
                    onChangeText={setMinPace}
                    placeholder="5:30"
                    keyboardType="numbers-and-punctuation"
                    maxLength={8}
                  />
                </Section>
              </>
            )}

            {/* Optional links */}
            <Section label="Route link (optional)">
              <Input
                value={routeLink}
                onChangeText={setRouteLink}
                placeholder="Strava / Komoot route URL"
                keyboardType="url"
                autoCapitalize="none"
              />
            </Section>

            <Section label="WhatsApp group link (optional)">
              <Input
                value={whatsappLink}
                onChangeText={setWhatsappLink}
                placeholder="https://chat.whatsapp.com/..."
                keyboardType="url"
                autoCapitalize="none"
              />
            </Section>

            {/* Submit */}
            <TouchableOpacity
              onPress={submit}
              disabled={loading}
              activeOpacity={0.85}
              className="bg-sage-green rounded-2xl py-4 items-center mt-2 mb-10"
            >
              <Text className="text-black font-black text-base tracking-widest">
                {loading ? 'CREATING…' : 'CREATE SESSION →'}
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
      <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mb-2">
        {label}
      </Text>
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
