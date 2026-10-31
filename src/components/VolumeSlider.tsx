import { useRef, useState } from 'react';
import { type GestureResponderEvent, StyleSheet, View } from 'react-native';

import { colors, MIN_TAP, radius, space } from '@/theme';

import { AppText } from './AppText';

type Props = {
  value: number;
  onChange: (value: number) => void;
};

const THUMB = 28;
const STEP = 0.05;

/**
 * Volume, 0..1. Drag or tap anywhere on the track; the whole row is a 56px
 * touch target. Screen readers get an adjustable control with up/down steps.
 */
export function VolumeSlider({ value, onChange }: Props) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);

  const setFromTouch = (e: GestureResponderEvent) => {
    const w = widthRef.current;
    if (w <= 0) return;
    const x = e.nativeEvent.locationX - THUMB / 2;
    onChange(Math.min(1, Math.max(0, x / (w - THUMB))));
  };

  const percent = Math.round(value * 100);
  const thumbLeft = width > 0 ? value * (width - THUMB) : 0;

  return (
    <View style={styles.row}>
      <AppText variant="caption" tone="secondary" style={styles.label}>
        Volume
      </AppText>
      <View
        style={styles.track}
        onLayout={(e) => {
          widthRef.current = e.nativeEvent.layout.width;
          setWidth(e.nativeEvent.layout.width);
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={setFromTouch}
        onResponderMove={setFromTouch}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Volume"
        accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent} percent` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const delta = e.nativeEvent.actionName === 'increment' ? STEP : -STEP;
          onChange(Math.min(1, Math.max(0, value + delta)));
        }}>
        {/* Children ignore touches so locationX is always relative to the track. */}
        <View pointerEvents="none" style={styles.rail}>
          <View style={[styles.fill, { width: thumbLeft + THUMB / 2 }]} />
        </View>
        <View pointerEvents="none" style={[styles.thumb, { left: thumbLeft }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, alignSelf: 'stretch' },
  label: { width: 56 },
  track: { flex: 1, height: MIN_TAP, justifyContent: 'center' },
  rail: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.lavender },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.text,
    top: (MIN_TAP - THUMB) / 2,
  },
});
