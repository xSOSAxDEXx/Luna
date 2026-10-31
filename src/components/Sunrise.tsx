import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme';

type Props = {
  /** 0 = sun below the horizon, 1 = risen. */
  progress: number;
  size?: number;
  children?: ReactNode;
};

/**
 * A soft sunrise for the gentle wake-up (CLAUDE.md §3.4). The sun rises
 * slowly over the five minutes and the horizon glow warms with it. It moves
 * only as the wake-up progresses (no animation loop), so it's calm and fine
 * with reduced motion.
 */
export function Sunrise({ progress, size = 260, children }: Props) {
  const p = Math.min(1, Math.max(0, progress));
  const horizon = size * 0.72;
  const sunR = size * 0.16;
  // From just below the horizon to comfortably above it.
  const sunY = horizon + sunR * 0.9 - p * size * 0.36;

  return (
    <View style={{ width: size, height: size }}>
      {/* Decorative; the text below says what's happening. */}
      <View
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="72%" rx="60%" ry="45%">
              <Stop offset="0" stopColor={colors.sunriseSky} stopOpacity={0.35 + 0.5 * p} />
              <Stop offset="1" stopColor={colors.sky} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="sun" cx="50%" cy="50%" r="50%">
              <Stop offset="0.55" stopColor={colors.sunrise} stopOpacity={0.9} />
              <Stop offset="1" stopColor={colors.sunrise} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={size} height={size} rx={size / 2} fill="url(#glow)" />
          <Circle cx={size / 2} cy={sunY} r={sunR * 1.6} fill="url(#sun)" />
          {/* Ground: hides the sun below the horizon. */}
          <Rect x={0} y={horizon} width={size} height={size - horizon} fill={colors.sky} />
          <Line
            x1={size * 0.12}
            x2={size * 0.88}
            y1={horizon}
            y2={horizon}
            stroke={colors.sunrise}
            strokeOpacity={0.35}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      </View>
      <View style={[StyleSheet.absoluteFill, styles.text, { paddingTop: size * 0.12 }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  text: { alignItems: 'center' },
});
