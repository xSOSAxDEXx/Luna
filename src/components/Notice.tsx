import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, MIN_TAP, radius, space } from '@/theme';

import { AppText } from './AppText';
import { CloseIcon } from './icons';

type Props = {
  title: string;
  body: string;
  onDismiss?: () => void;
  children?: ReactNode;
};

/** A soft, low-contrast card for gentle tips and status messages. */
export function Notice({ title, body, onDismiss, children }: Props) {
  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.text}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" tone="secondary">
          {body}
        </AppText>
        {children}
      </View>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={`Dismiss: ${title}`}
          style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}>
          <CloseIcon color={colors.textMuted} size={20} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: space.md,
    paddingLeft: space.md,
  },
  text: { flex: 1, gap: space.xs, paddingRight: space.sm },
  dismiss: {
    width: MIN_TAP,
    height: MIN_TAP,
    marginVertical: -space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
