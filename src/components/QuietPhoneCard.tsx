import { Platform, Pressable, StyleSheet } from 'react-native';

import { CAN_OPEN_QUIET_SETTINGS, openQuietSettings, QUIET_PHONE } from '@/safety/quietPhone';
import { MIN_TAP, radius, space } from '@/theme';

import { AppText } from './AppText';
import { Notice } from './Notice';

/** The soft, dismissible "quiet your phone" card shown when a sound starts. */
export function QuietPhoneCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Notice title={QUIET_PHONE.title} body={QUIET_PHONE.body} onDismiss={onDismiss}>
      {CAN_OPEN_QUIET_SETTINGS ? (
        <Pressable
          onPress={() => void openQuietSettings()}
          accessibilityRole="button"
          accessibilityHint="Opens your phone's Do Not Disturb settings"
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <AppText variant="label" tone="lavender">
            {QUIET_PHONE.button}
          </AppText>
        </Pressable>
      ) : Platform.OS === 'ios' ? (
        <AppText variant="caption" tone="muted">
          {QUIET_PHONE.iosHint}
        </AppText>
      ) : null}
    </Notice>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TAP,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: space.md,
    marginLeft: -space.md,
    marginBottom: -space.sm,
    borderRadius: radius.pill,
  },
  pressed: { opacity: 0.7 },
});
