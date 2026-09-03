/**
 * Sdílené komponenty pro kalkulátory (F5 v0.7.4).
 * Slider, numeric input, table row s barevným ratingem, chip picker.
 */

import { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme, Theme } from '../../theme';
import { useFontStore } from '../../store/fontStore';

// Barvy pro rating
export const RATING_COLORS: Record<string, string> = {
  ideal: '#10b981',    // emerald-500
  ok: '#22c55e',        // green-500
  max: '#eab308',       // yellow-500
  caution: '#f59e0b',   // amber-500
  stop: '#ef4444',      // red-500
  never: '#7f1d1d',     // red-900
};

// -----------------------------------------------------------------------------

/**
 * Vlastní jednoduchý slider (bez @react-native-community/slider dependency).
 * PanResponder pro drag na track, taky tap kdekoliv na track.
 */
export function CalcSlider({
  value,
  min,
  max,
  step,
  onValueChange,
  suffix,
  theme,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (v: number) => void;
  suffix?: string;
  theme: Theme;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackRef = useRef<View>(null);
  const range = max - min;
  const stepSize = step ?? 1;

  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const snapToStep = (v: number) => Math.round((v - min) / stepSize) * stepSize + min;

  const posToValue = (pos: number) => {
    if (trackWidth <= 0) return value;
    const pct = clamp(pos / trackWidth * range + min);
    return clamp(snapToStep(pct));
  };

  // Ref na posToValue — capture aktuální trackWidth pro PanResponder
  const posToValueRef = useRef(posToValue);
  posToValueRef.current = posToValue;

  const panResponder = useRef(
    PanResponder.create({
      // Capture = zabrat gesture PŘED ScrollView (jinak scroll parent hltá)
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        const v = posToValueRef.current(evt.nativeEvent.locationX);
        onValueChange(v);
      },
      onPanResponderMove: (evt) => {
        const v = posToValueRef.current(evt.nativeEvent.locationX);
        onValueChange(v);
      },
    }),
  ).current;

  const percent = trackWidth > 0 ? ((value - min) / range) * 100 : 0;

  return (
    <View>
      {/* Větší hitbox — padding 12px kolem samotného tracku pro snadné chycení palcem */}
      <View
        {...panResponder.panHandlers}
        style={shared.sliderHitArea}
      >
        <View
          ref={trackRef}
          onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
          style={[shared.sliderTrack, { backgroundColor: theme.border }]}
        >
          <View
            style={[
              shared.sliderFill,
              { backgroundColor: theme.accent, width: `${percent}%` },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              shared.sliderThumb,
              {
                backgroundColor: theme.accent,
                left: `${percent}%`,
                borderColor: theme.surface,
              },
            ]}
          />
        </View>
      </View>
      <Text style={[shared.sliderValue, { color: theme.text }]}>
        {value.toFixed(step && step < 1 ? 1 : 0)}{suffix ?? ''}
      </Text>
    </View>
  );
}

// -----------------------------------------------------------------------------

export function CalcInput({
  value,
  onChangeText,
  placeholder,
  suffix,
  theme,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  theme: Theme;
}) {
  return (
    <View style={[shared.inputWrap, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textDim}
        keyboardType="decimal-pad"
        style={[shared.input, { color: theme.text }]}
      />
      {suffix && <Text style={[shared.inputSuffix, { color: theme.textMuted }]}>{suffix}</Text>}
    </View>
  );
}

// -----------------------------------------------------------------------------

export function ChipPicker<T extends string>({
  options,
  value,
  onSelect,
  theme,
}: {
  options: { key: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
  theme: Theme;
}) {
  return (
    <View style={shared.chipRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          onPress={() => onSelect(opt.key)}
          style={[
            shared.chip,
            {
              backgroundColor: value === opt.key ? theme.accent : theme.surfaceAlt,
              borderColor: value === opt.key ? theme.accent : theme.border,
            },
          ]}
        >
          <Text style={{
            color: value === opt.key ? theme.accentOn : theme.text,
            fontSize: 13,
            fontWeight: '500',
          }}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// -----------------------------------------------------------------------------

export function ResultBig({
  label,
  value,
  suffix,
  color,
  theme,
}: {
  label: string;
  value: string;
  suffix?: string;
  color?: string;
  theme: Theme;
}) {
  return (
    <View style={[shared.resultBig, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
      <Text style={[shared.resultLabel, { color: theme.textMuted }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={[shared.resultValue, { color: color ?? theme.accent }]}>{value}</Text>
        {suffix && <Text style={[shared.resultSuffix, { color: theme.textMuted }]}>{suffix}</Text>}
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------------

export function CalcLabel({ children, theme }: { children: React.ReactNode; theme: Theme }) {
  return <Text style={[shared.label, { color: theme.textMuted }]}>{children}</Text>;
}

export function CalcSection({ children }: { children: React.ReactNode }) {
  return <View style={shared.section}>{children}</View>;
}

export function CalcNote({ children, theme }: { children: React.ReactNode; theme: Theme }) {
  return <Text style={[shared.note, { color: theme.textDim }]}>{children}</Text>;
}

// -----------------------------------------------------------------------------

export const shared = StyleSheet.create({
  section: { marginBottom: 16 },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  sliderValue: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  sliderHitArea: {
    // 44px hitbox (Apple HIG minimum touch target), s tenkým track uvnitř
    paddingVertical: 18,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 8,
    borderRadius: 4,
    position: 'relative',
  },
  sliderFill: {
    height: 8,
    borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -12,
    borderWidth: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  inputSuffix: { fontSize: 13, marginLeft: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  resultBig: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  resultLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  resultValue: { fontSize: 28, fontWeight: '700' },
  resultSuffix: { fontSize: 14, marginLeft: 4 },
  note: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 14,
  },
});
