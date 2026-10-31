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
| 4. Loop / Mix / Shuffle + saved mixes                                      | ✅ Code done and tested (132 tests). ⏳ Device tests 11–13 in `docs/android-testing.md` on Android build #3.                                               |
| 5. Wake-up cycle                                                           | **Next**                                                                                                                                                   |
| 6. Recording + backup/restore                                              | —                                                                                                                                                          |
| 7. Quiet-phone reminder, dim mode, volume safety, onboarding, affirmations | —                                                                                                                                                          |
| 8. Polish, accessibility, store readiness                                  | —                                                                                                                                                          |

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
  `android-preview-N` with the APK. Builds take ~15 min. Builds 1–3 so far;
  **#3 has Mix/Shuffle** (published 2:17 pm ET, 31 Oct).
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
  `jest.setup.ts` (worklets, AsyncStorage, an expo-audio fake).
