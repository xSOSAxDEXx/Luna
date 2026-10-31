import { useRef, useState } from 'react';
import { type GestureResponderEvent, StyleSheet, View } from 'react-native';

import { colors, MIN_TAP, radius, space } from '@/theme';

import { AppText } from './AppText';

type Props = {
  value: number;
  onChange: (value: number) => void;
  /** Visible label and screen-reader name, e.g. "Rain" for a mix layer. */
  label?: string;
  /**
   * The highest value allowed (the soft volume cap). The track still shows
   * the full range, with a soft mark where the cap sits.
   */
  max?: number;
};

const THUMB = 28;
const STEP = 0.05;

/**
 * Volume, 0..1. Drag or tap anywhere on the track; the whole row is a 56px
 * touch target. Screen readers get an adjustable control with up/down steps.
 */
export function VolumeSlider({ value, onChange, label = 'Volume', max = 1 }: Props) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);

  const setFromTouch = (e: GestureResponderEvent) => {
    const w = widthRef.current;
    if (w <= 0) return;
    const x = e.nativeEvent.locationX - THUMB / 2;
    onChange(Math.min(max, Math.max(0, x / (w - THUMB))));
  };

  const percent = Math.round(value * 100);
  const shown = Math.min(max, value);
  const thumbLeft = width > 0 ? shown * (width - THUMB) : 0;
  const capLeft = width > 0 ? max * (width - THUMB) + THUMB / 2 : 0;

  return (
    <View style={styles.row}>
      <AppText variant="caption" tone="secondary" style={styles.label} numberOfLines={2}>
        {label}
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
        accessibilityLabel={label === 'Volume' ? 'Volume' : `${label} volume`}
        accessibilityValue={{
          min: 0,
          max: Math.round(max * 100),
          now: percent,
          text: max < 1 ? `${percent} percent, soft cap on` : `${percent} percent`,
        }}
        // The web needs these spelled out (react-native-web drops accessibilityValue).
        aria-valuemin={0}
        aria-valuemax={Math.round(max * 100)}
        aria-valuenow={percent}
        aria-valuetext={max < 1 ? `${percent} percent, soft cap on` : `${percent} percent`}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const delta = e.nativeEvent.actionName === 'increment' ? STEP : -STEP;
          onChange(Math.min(max, Math.max(0, value + delta)));
        }}>
        {/* Children ignore touches so locationX is always relative to the track. */}
        <View pointerEvents="none" style={styles.rail}>
          <View style={[styles.fill, { width: thumbLeft + THUMB / 2 }]} />
        </View>
        {max < 1 && width > 0 ? (
          <View pointerEvents="none" style={[styles.capMark, { left: capLeft - 1 }]} />
        ) : null}
        <View pointerEvents="none" style={[styles.thumb, { left: thumbLeft }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, alignSelf: 'stretch' },
  label: { width: 72 },
  track: { flex: 1, height: MIN_TAP, justifyContent: 'center' },
  rail: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.lavender },
  // Where the soft volume cap sits: a small, quiet tick.
  capMark: {
    position: 'absolute',
    width: 2,
    height: 14,
    borderRadius: 1,
    backgroundColor: colors.textMuted,
    top: (MIN_TAP - 14) / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.text,
    top: (MIN_TAP - THUMB) / 2,
  },
});
