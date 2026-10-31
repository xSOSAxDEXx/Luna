# Luna Beats

Gentle sleep sounds for babies. One tap to calm.

One codebase ships the iOS app, the Android app and an installable website
(PWA). Everything stays on the device: no account, no analytics, no
personal data. The full product brief and build order live in
[`CLAUDE.md`](./CLAUDE.md).

## Getting started

```bash
npm install
npm run web        # in the browser
npm run ios        # needs a development build (see below)
npm run android
```

`expo-audio` includes native code, so the phone apps run in a
[development build](https://docs.expo.dev/develop/development-builds/introduction/)
rather than Expo Go: `npx expo run:ios` / `npx expo run:android` locally, or
`npx eas-cli@latest build --profile development`.

## Scripts

| Command                           | What it does                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `npm run check`                   | Typecheck, lint, format check and tests (run before every commit)            |
| `npm test`                        | Jest + React Native Testing Library                                          |
| `npm run lint` / `npm run format` | ESLint (Expo config) / Prettier                                              |
| `npm run build:web`               | Export the website/PWA to `dist/`                                            |
| `npm run icons`                   | Render every app icon, splash and PWA icon from `assets/brand/logo-mark.svg` |
| `npm run noise`                   | Regenerate the white, pink and brown noise loops                             |

Generated icons and noise files are committed, so normal builds never run
these scripts.

## Stack

- **Expo SDK 58**, React Native, TypeScript, Expo Router (`src/app/`)
- **Web/PWA:** single-page export, `public/manifest.webmanifest`, and a
  service worker (`public/sw.js`) that makes the installed app open offline
- **Theme:** `src/theme/` holds colours, type (Nunito), spacing and motion
  tokens. Tests check the night palette (no pure white or bright blue, WCAG
  AA text contrast).
- **State:** Zustand (added in step 2, when there is state to hold)
- **Tests:** Jest (`jest-expo`) and React Native Testing Library

## Audio: why `expo-audio`

The brief asked for `expo-audio` if it fully supports background and
lock-screen playback on the current SDK, and otherwise
`react-native-track-player`. On SDK 58, `expo-audio` covers everything we
need:

- **Background playback**: its config plugin adds iOS `UIBackgroundModes: audio`
  and the Android media-playback foreground service (set in `app.json`).
- **Lock-screen and notification controls** via `setActiveForLockScreen`.
- **Interruptions** (calls, other apps) via `interruptionMode`.
- **Several players at once**, which Mix mode needs for its 3 layers and
  Shuffle needs for crossfades. Track-player has a single queue and can't
  layer sounds.
- **Recording**, for My Sounds. Track-player can't record, so it would have
  meant two audio libraries.
- **Web support** from the same API.

Known limits to design around:

- Only one player owns the lock-screen controls at a time. In Mix mode the
  first layer will own them.
- Lock-screen controls need `interruptionMode: 'doNotMix'`, so Luna Beats
  pauses other apps' audio while it plays. That suits a sleep app.
- On Android, background playback stops after about 3 minutes unless the
  player is active for the lock screen. The player engine (step 2) always
  sets this.

These behaviours still need checking on real devices in step 3.

## Sounds

White, pink and brown noise are generated in code
(`src/audio/noise.ts`, run by `scripts/generate-noise.ts`): 30-second
seamless loops with a fixed seed, so every run produces identical files and
no licence is needed. All other sounds must be CC0 or royalty-free and be
recorded in [`assets/sounds/LICENSES.md`](./assets/sounds/LICENSES.md), which
also lists the sounds still to source.

## Web and PWA limits

The website installs as an app and opens offline. Playing through the night
with the screen locked is less reliable in phone browsers (iOS Safari
especially) than in the native app. Step 3 tests this on real devices and
documents the actual limits here. The app will show a gentle tip on the web
suggesting the installed app for overnight use.

## Project layout

```
src/app/          Expo Router screens: (tabs) Sounds, My Sounds, Settings; player
src/components/   Shared UI (AppText, Screen, BreathingMoon, icons)
src/audio/        Audio engine (step 2+) and the noise generator
src/theme/        Colours, typography, spacing, motion
src/pwa/          Service worker registration (web only)
assets/brand/     Logo SVG (source) and generated icons
assets/sounds/    Bundled audio and LICENSES.md
public/           Web template, PWA manifest, service worker, PWA icons
scripts/          Icon and noise generators
```
