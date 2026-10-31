# Progress and handoff notes

Where the build is, what's been decided, and what's waiting. Read this with
`CLAUDE.md` (the brief) at the start of a new session.

_Last updated: 31 Oct 2026._

## Build order status (CLAUDE.md §6)

| Step                                                                       | Status                                                                                                                                                     |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Scaffold                                                                | ✅ Done                                                                                                                                                    |
| 2. Library + single-sound playback, timer, quick-add, fade-out             | ✅ Done                                                                                                                                                    |
| 3. Background / lock screen / offline                                      | ✅ Android verified on device (`docs/device-results.md`). ⏳ iPhone: testing the **web app** in Safari (`docs/iphone-web-testing.md`); results not in yet. |
| 4. Loop / Mix / Shuffle + saved mixes                                      | ✅ Done. Android tests 11–13 pass on build #3 (`docs/device-results.md`).                                                                                  |
| 5. Wake-up cycle                                                           | ✅ Done. Android test 14 passes on build #4. ⏳ iPhone W11 (web).                                                                                          |
| 6. Recording + backup/restore                                              | ✅ Built; web checked in Chromium (record, reload, backup, restore). ⏳ Android tests 15–19 on build #5; iPhone W12–W14 (web).                             |
| 7. Quiet-phone reminder, dim mode, volume safety, onboarding, affirmations | ✅ Built; checked in Chromium. ⏳ Android tests 20–23 on build #6; iPhone W15–W16 (web). Step 6 device tests also still to run.                            |
| 8. Polish, accessibility, store readiness                                  | **Next**                                                                                                                                                   |

## Owner decisions (don't re-ask)

- **Fuel repo isn't available**: use defaults (Zustand, Expo ESLint +
  Prettier, Jest + RNTL, `src/app` routes).
- **Audio:** `expo-audio` (approved). Noise is generated at build time
  (`npm run noise`, approved).
- **Safe-sleep reminder** on every start, can't be turned off (CLAUDE.md
  §3.9). Child safety is a hard requirement; weakening it needs approval.
- **After a phone call:** resume automatically (Option A, tested on
  Android). Recorded in CLAUDE.md §3.5.
- **iPhone:** no Apple Developer account for now (option C). Test the
  GitHub Pages web app in Safari. Revisit native iOS (paid account, $99/yr)
  later; ask before adding.
- **Hosting:** web app stays on GitHub Pages:
  https://xsosaxdexx.github.io/Luna/
- **Times:** give all times to the owner in US Eastern time
  (`America/New_York`: EDT until 1 Nov 2026, EST after), not UTC.

## Defaults I chose (owner can change)

- Timer fade fills the **last** 30 s (silent exactly at 0:00); countdown
  shown in minutes, not seconds; default volume 35%.
- Shuffle: 5 minutes per sound, 4 s equal-power crossfade; shuffle sets
  aren't saved. Mix layers default to 80%.
- Unsourced sounds play one shared placeholder and show a "Placeholder" tag.
- Wake-up: off by default; 30 s crossfade in under the sleep fade, starting
  at 15% of the chosen volume and rising (eased) to it over 5 minutes, then
  a 30 s fade out and "Good morning". Auto = Light chimes (generated in
  code; birds and melody are placeholders). Quick-add hidden during the
  wake-up; it needs a timer (not "Until I stop").

- Recording: AAC mono 96 kbps; anything playing stops while recording;
  20-minute limit per take; silence trim on by default (loops the voiced
  part, file untouched); icons note/book/heart/moon/star/leaf and six
  palette colors. Permission explained first, asked only on Record.
- Backup: one JSON file with audio as base64; restore only adds (never
  deletes or overwrites), favorites combined, backup's volume and wake-up
  settings applied. Web recordings live in IndexedDB (may be cleared; the
  app says so).

- Step 7: quiet card follows the safety reminder (never together, never
  instead of it); default "Every time". Dim after 8 s without a touch, only
  while playing, off with a screen reader (native). Soft volume cap 60%, on
  by default; new backups carry the cap and reminder settings (older ones
  restore with the gentle defaults). Welcome: 3 pages, skippable, once.
  Affirmations change after each visit away from the library.

## Still open with the owner

- **App ID** `com.lunabeats.app` is a placeholder; must be final before the
  first store / Apple registration.
- **PR into `main`**: the brief says push to `main`; all work is on branch
  `ccr-0c40b67b-ep5bux` (currently the repo's only branch). Not asked to
  open a PR yet.
- **Real sound files**: everything except white/pink/brown noise is a
  placeholder; needs CC0/royalty-free sources (`assets/sounds/LICENSES.md`).
- Safe-sleep wording could use review by someone with child-safety
  expertise before release.

## Before launch (must do)

- Remove `EXPO_PUBLIC_DIAGNOSTICS: '1'` from `.github/workflows/web-pages.yml`
  (the Pages site shows the Playback check log for testing).
- Replace placeholder sounds; store signing (test APKs use the debug key).

## How things are built and tested

- `npm run check`: typecheck, lint, format, tests (run before every commit).
- **Android test APK:** GitHub Actions → "Android preview build" (run with
  workflow_dispatch on `ccr-0c40b67b-ep5bux`); publishes a pre-release
  `android-preview-N` with the APK. Builds take ~15 min. Builds 1–4 so far
  (#4 has the wake-up); #5 is step 6, #6 is step 7.
- **Web:** GitHub Actions → "Web app (GitHub Pages)" (workflow_dispatch).
- This sandbox can't reach `github.io` or `docs.expo.dev` (proxy 403), and
  `expo install` needs `EXPO_OFFLINE=1`. Browser checks run against a local
  static server on the export in `dist/`.
- Test phone: Samsung Galaxy S21+ (SM-G996U, AT&T), Android 13, One UI 5.1.

## Key technical notes

- React Native pauses JS timers when an Android app is backgrounded. The
  engine also ticks on expo-audio's native status updates (every 500 ms
  while playing), which keep coming in the background; verified on device
  (timer stopped 195 ms late while backgrounded).
- Engine (`src/audio/engine.ts`) plays a **program** (single / mix /
  shuffle) as voices; voice 0 owns the lock screen and outside events.
  Everything is computed from timestamps, so ticks are idempotent.
- Outside pauses are detected from status updates
  (`createExternalChangeDetector` in `src/audio/expoOutput.ts`).
- Web: service worker precaches the whole export (file list filled in by
  `scripts/postexport-web.mjs`), serves audio byte ranges from cache, and
  works under the `/Luna` sub-path (`EXPO_BASE_URL`, `app.config.js`).
- Jest needs `react-native-reanimated/jest/resolver` and the mocks in
  `jest.setup.ts` (worklets, AsyncStorage, an expo-audio fake with a
  recorder, an in-memory expo-file-system, expo-sharing).
- Trimmed recordings loop by seeking on expo-audio status updates
  (`loopRangeSeek`, every 250 ms for those players), so the loop point works
  with the screen off too.
- Web checks of recording use Chromium's fake microphone
  (`--use-fake-device-for-media-stream`).
