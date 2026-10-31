import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ChevronDownIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import {
  PRIVACY_SECTIONS,
  PRIVACY_SUMMARY,
  PRIVACY_UPDATED,
  privacyContactLine,
} from '@/legal/privacy';
import { colors, MIN_TAP, radius, space } from '@/theme';

/** The full privacy policy, readable offline inside the app. */
export default function PrivacyScreen() {
  const close = () => (router.canGoBack() ? router.back() : router.replace('/settings'));
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.topRow}>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <ChevronDownIcon color={colors.textSecondary} />
        </Pressable>
        <AppText variant="title" accessibilityRole="header" style={styles.title}>
          Privacy
        </AppText>
        <View style={styles.close} />
      </View>
      <AppText variant="caption" tone="muted">
        Last updated: {PRIVACY_UPDATED}
      </AppText>
      <View style={styles.summary}>
        <AppText variant="bodyStrong">{PRIVACY_SUMMARY}</AppText>
      </View>
      {PRIVACY_SECTIONS.map((section) => (
        <View key={section.heading} style={styles.section}>
          <AppText variant="label" tone="moon" accessibilityRole="header">
            {section.heading}
          </AppText>
          {section.paragraphs.map((p) => (
            <AppText key={p} tone="secondary">
              {p}
            </AppText>
          ))}
        </View>
      ))}
      <AppText variant="caption" tone="muted">
        {privacyContactLine()}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center' },
  close: {
    width: MIN_TAP,
    height: MIN_TAP,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -space.md,
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  section: { gap: space.xs },
  pressed: { opacity: 0.7 },
});
