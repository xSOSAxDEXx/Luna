import { Platform } from 'react-native';

import { useSettings } from '@/store/settings';

import { Notice } from './Notice';

/**
 * Web only, once until dismissed: phone browsers can pause audio when the
 * screen locks, so suggest the installed app for all-night use.
 */
export function WebTip() {
  const dismissed = useSettings((s) => s.webTipDismissed);
  const dismiss = useSettings((s) => s.dismissWebTip);
  if (Platform.OS !== 'web' || dismissed) return null;
  return (
    <Notice
      title="For all-night sound"
      body="Phone browsers can pause audio when the screen locks. The Luna Beatzzz app keeps playing reliably. In the browser, keep this page open."
      onDismiss={dismiss}
    />
  );
}
