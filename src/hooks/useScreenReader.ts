import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Whether VoiceOver / TalkBack is on (dim mode stays off for screen-reader
 * users). Browsers can't tell, and react-native-web always answers "yes",
 * so on the web this is false; the dim screen is itself a labelled button.
 */
export function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((on) => alive && setEnabled(on))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return enabled;
}
