import { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Props {
  value: Date;
  onChange: (d: Date) => void;
  mode: 'date' | 'time';
  minimumDate?: Date;
}

export function DatePickerField({ value, onChange, mode, minimumDate }: Props) {
  const [show, setShow] = useState(false);

  const displayText =
    mode === 'date'
      ? value.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;

  return (
    <View>
      <TouchableOpacity
        onPress={() => setShow((v) => !v)}
        activeOpacity={0.8}
        className="bg-sage-surface rounded-xl px-4 py-3 flex-row justify-between items-center"
      >
        <Text className="text-sage-text text-sm">{displayText}</Text>
        <Text className="text-sage-muted text-sm">{mode === 'date' ? '📅' : '⏰'}</Text>
      </TouchableOpacity>

      {show && (
        <View className="bg-sage-surface rounded-xl mt-2 overflow-hidden">
          {Platform.OS === 'ios' && (
            <TouchableOpacity onPress={() => setShow(false)} className="items-end px-4 pt-2">
              <Text className="text-sage-green font-bold text-sm">Done</Text>
            </TouchableOpacity>
          )}
          <DateTimePicker
            value={value}
            mode={mode}
            minimumDate={minimumDate}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant="dark"
            onChange={(_, selected) => {
              if (Platform.OS !== 'ios') setShow(false);
              if (selected) onChange(selected);
            }}
          />
        </View>
      )}
    </View>
  );
}
