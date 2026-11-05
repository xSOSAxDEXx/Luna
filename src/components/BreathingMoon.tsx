import { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { duration, useMotion } from '@/theme';

const mark = require('@/assets/brand/logo-mark.png');

/**
 * The logo mark, slowly "breathing" (4s in, 4s out). Holds still when the
 * OS reduce-motion setting is on.
 */
export function BreathingMoon({ size = 120 }: { size?: number }) {
  const { ambient } = useMotion();
  const breath = useSharedValue(0);

  useEffect(() => {
    if (!ambient) {
      cancelAnimation(breath);
      breath.value = 0;
      return;
    }
    breath.value = withRepeat(
      withTiming(1, { duration: duration.breath, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(breath);
  }, [ambient, breath]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.85 + breath.value * 0.15,
    transform: [{ scale: 0.97 + breath.value * 0.03 }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <Image
        source={mark}
        style={styles.image}
        accessibilityRole="image"
        accessibilityLabel="Luna Beatzzz moon"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
});
