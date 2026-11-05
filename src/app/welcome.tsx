import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BreathingMoon } from '@/components/BreathingMoon';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { QUIET_PHONE } from '@/safety/quietPhone';
import { useSettings } from '@/store/settings';
import { space } from '@/theme';

/**
 * A short, gentle welcome on first launch: what the app does, the
 * one-time volume and distance tip (CLAUDE.md §3.8), and quieting the phone.
 * Skippable at any point; it never comes back by itself.
 */
const PAGES = [
  {
    title: 'Welcome to Luna Beatzzz',
    body: [
      'One tap to calm. Choose a sound and it plays straight away, with a 10-minute timer you can add to.',
      'When the timer ends, the sound fades out slowly. Never a sudden stop.',
    ],
  },
  {
    title: 'Soft, and across the room',
    body: [
      'Place your phone across the room from the crib, never in or on it, and keep the volume soft. Sounds start quietly, and a soft volume cap is on. You can change it in Settings.',
      'Never leave a phone or charger plugged in near your baby.',
    ],
  },
  {
    title: QUIET_PHONE.title,
    body: [
      `${QUIET_PHONE.body} We’ll remind you gently when a sound starts. You can change how often in Settings.`,
      'You’re doing great.',
    ],
  },
] as const;

export default function WelcomeScreen() {
  const [page, setPage] = useState(0);
  const finishOnboarding = useSettings((s) => s.finishOnboarding);
  const last = page === PAGES.length - 1;
  const { title, body } = PAGES[page];

  const done = () => {
    finishOnboarding();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.body}>
        <BreathingMoon size={112} />
        <AppText variant="title" accessibilityRole="header" style={styles.center}>
          {title}
        </AppText>
        {body.map((line) => (
          <AppText key={line} tone="secondary" style={styles.center}>
            {line}
          </AppText>
        ))}
      </View>
      <AppText
        variant="caption"
        tone="muted"
        style={styles.center}
        accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}>
        {PAGES.map((_, i) => (i === page ? '●' : '○')).join('  ')}
      </AppText>
      <View style={styles.actions}>
        <Button
          label={last ? 'Begin' : 'Next'}
          variant="primary"
          onPress={last ? done : () => setPage(page + 1)}
        />
        {last ? null : <Button label="Skip" onPress={done} />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  center: { textAlign: 'center' },
  actions: { gap: space.sm },
});
