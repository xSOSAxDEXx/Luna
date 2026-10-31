import { readFileSync } from 'node:fs';
import path from 'node:path';

import { privacyHtml, privacyMarkdown, PRIVACY_SECTIONS, PRIVACY_SUMMARY } from '../privacy';

const root = path.resolve(__dirname, '../../..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

describe('privacy policy', () => {
  it('the docs and web copies match the app (run `npm run privacy` if not)', () => {
    expect(read('docs/privacy-policy.md')).toBe(privacyMarkdown());
    expect(read('public/privacy.html')).toBe(privacyHtml());
  });

  it('says plainly that no data leaves the device', () => {
    expect(PRIVACY_SUMMARY).toMatch(/does not collect, send or share any personal information/);
    const all = PRIVACY_SECTIONS.flatMap((s) => s.paragraphs).join(' ');
    expect(all).toMatch(/microphone only while you record/);
    expect(all).toMatch(/never uploaded/);
    expect(all).toMatch(/no advertising, analytics or tracking/);
  });

  it('matches the microphone explanation shown by the phone', () => {
    const app = JSON.parse(read('app.json')).expo;
    const audio = app.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-audio');
    expect(audio[1].microphonePermission).toMatch(/only when you record/);
    expect(audio[1].microphonePermission).toMatch(/stay on your device/);
  });

  it('declares no tracking and no collected data to Apple', () => {
    const ios = JSON.parse(read('app.json')).expo.ios;
    expect(ios.privacyManifests).toMatchObject({
      NSPrivacyTracking: false,
      NSPrivacyCollectedDataTypes: [],
    });
  });

  it('keeps Android permissions to what the app uses', () => {
    const android = JSON.parse(read('app.json')).expo.android;
    expect(android.blockedPermissions).toEqual(
      expect.arrayContaining([
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ]),
    );
  });

  it('escapes text in the web page', () => {
    expect(privacyHtml('a<b>@example.com')).toContain('a&lt;b&gt;@example.com');
  });
});
