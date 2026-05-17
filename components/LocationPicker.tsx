import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Linking, Platform,
} from 'react-native';
import * as Location from 'expo-location';

interface Props {
  address: string;
  latitude: number | null;
  longitude: number | null;
  onChange: (address: string, lat: number | null, lng: number | null) => void;
  placeholder?: string;
}

export function LocationPicker({ address, latitude, longitude, onChange, placeholder }: Props) {
  const [locating, setLocating] = useState(false);

  async function useMyLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow location access to use this feature.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = loc.coords;

      // Reverse geocode to get a human-readable address
      const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const g = geo[0];
      const parts = [g?.name, g?.street, g?.district, g?.city].filter(Boolean);
      const resolved = parts.length > 0 ? parts.join(', ') : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      onChange(resolved, lat, lng);
    } catch (e: any) {
      Alert.alert('Location error', e.message ?? 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  }

  function openInMaps() {
    if (!latitude || !longitude) return;
    const url = Platform.OS === 'ios'
      ? `maps://0,0?q=${encodeURIComponent(address || 'Start point')}&ll=${latitude},${longitude}`
      : `geo:${latitude},${longitude}?q=${encodeURIComponent(address || 'Start point')}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://maps.google.com/?q=${latitude},${longitude}`)
    );
  }

  return (
    <View className="gap-2">
      {/* Address text input */}
      <View className="bg-sage-surface rounded-xl flex-row items-center px-4 py-3 gap-3">
        <Text style={{ fontSize: 16 }}>📍</Text>
        <TextInput
          value={address}
          onChangeText={(t) => onChange(t, latitude, longitude)}
          placeholder={placeholder ?? 'Meeting point / start location'}
          placeholderTextColor="#525252"
          className="flex-1 text-sage-text text-sm"
          multiline={false}
        />
      </View>

      {/* Action row */}
      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={useMyLocation}
          disabled={locating}
          activeOpacity={0.8}
          className="flex-1 bg-sage-green/15 border border-sage-green/30 rounded-xl py-2.5 flex-row items-center justify-center gap-2"
        >
          {locating ? (
            <ActivityIndicator size="small" color="#4ade80" />
          ) : (
            <Text style={{ fontSize: 14 }}>🎯</Text>
          )}
          <Text className="text-sage-green font-bold text-xs">
            {locating ? 'Locating…' : 'Use my location'}
          </Text>
        </TouchableOpacity>

        {latitude && longitude && (
          <TouchableOpacity
            onPress={openInMaps}
            activeOpacity={0.8}
            className="flex-1 bg-sage-surface border border-[#2a2a2a] rounded-xl py-2.5 flex-row items-center justify-center gap-2"
          >
            <Text style={{ fontSize: 14 }}>🗺️</Text>
            <Text className="text-sage-muted font-bold text-xs">Preview map</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Coordinates badge */}
      {latitude && longitude && (
        <Text className="text-sage-muted text-[10px] text-center">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </Text>
      )}
    </View>
  );
}
