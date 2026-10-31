import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/theme';

type Props = {
  /** 1 = full ring, 0 = empty. */
  progress: number;
  size?: number;
  children?: ReactNode;
};

const STROKE = 10;

/**
 * A soft countdown ring. It drains slowly and smoothly, with no tick marks
 * or seconds, so it reads as calm rather than urgent.
 */
export function TimerRing({ progress, size = 260, children }: Props) {
  const r = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.surfaceRaised}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.moon}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          // A full ring is drawn solid so the rounded ends don't leave a notch.
          strokeDasharray={clamped >= 0.999 ? undefined : `${circumference} ${circumference}`}
          strokeDashoffset={clamped >= 0.999 ? 0 : circumference * (1 - clamped)}
          // Start at 12 o'clock and drain anticlockwise.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          opacity={clamped > 0 ? 1 : 0}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
