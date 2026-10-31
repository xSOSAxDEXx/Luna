import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';

/** Parent recordings (lullabies and stories). Built in step 6. */
export default function MySoundsScreen() {
  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        My Sounds
      </AppText>
      <AppText tone="secondary">
        Soon you can record a lullaby or a story here, in your own voice.
      </AppText>
    </Screen>
  );
}
