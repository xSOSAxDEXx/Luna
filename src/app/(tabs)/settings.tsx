import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';

/** Settings (reminders, volume cap, backup and restore). Built in steps 6–7. */
export default function SettingsScreen() {
  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        Settings
      </AppText>
      <AppText tone="secondary">Nothing to adjust yet.</AppText>
    </Screen>
  );
}
