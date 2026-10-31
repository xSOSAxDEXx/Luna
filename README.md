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
- **State:** Zustand. Settings (volume, favorites) persist on-device with
  AsyncStorage.
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
  player is active for the lock screen. The player always sets this.

These behaviours still need checking on real devices in step 3.

## How playback works

`src/audio/engine.ts` (`PlayerEngine`) owns playback and the sleep timer.
Tapping a card starts the sound straight away on a 10-minute timer.

- **The timer is timestamps, not a countdown.** It stores when the sound
  should end (`src/audio/timer.ts`) and works out what's left from the
  clock, so a throttled or suspended app never drifts. When the app
  returns to the foreground it catches up at once.
- **Volume is recomputed from scratch on every tick**: chosen volume ×
  fade-in × fade-out. A late or skipped tick can't leave a fade stuck
  halfway.
- **Ticks come from the audio itself in the background.** React Native
  pauses JS timers when an Android app is in the background, so a plain
  `setInterval` would never stop the sound with the screen off. The player
  also ticks on every native status update from `expo-audio` (every 500 ms
  while sound is playing), which keeps coming in the background. A JS
  interval adds smoother ticks while the app is open.
- **Outside pauses are mirrored.** If a call, another app or the lock
  screen pauses the sound, the player notices (from the status updates),
  holds the timer and shows "Paused for a moment". A lock-screen resume
  carries on where it left off.
- **Lock screen** shows the sound and the time left ("12 min"), updated as
  it changes, with the scrub bar hidden.
- **Fades:** 1.5 s fade-in on start and resume. The end-of-timer fade fills
  the last 30 s, so the sound reaches silence exactly at 0:00. Stop and
  switching sounds fade over 1 s. Nothing ever cuts off hard.
- **Quick-add** (+5, +10, +15, +30) adds to the time left, even mid-fade
  (the volume comes back up). After the timer has ended, quick-add plays
  the same sound again for that long. "Until I stop" turns the timer off.
- **The countdown is shown in minutes** ("12 min", "Under a minute"), never
  ticking seconds, so it reads as calm rather than urgent.
- The default volume is soft (35%).

The engine talks to audio through a small `AudioOutput` interface
(`src/audio/expoOutput.ts` for the real app), so its tests run on a fake
clock with fake speakers.

## Play modes

- **Loop**: tap any sound; it repeats seamlessly.
- **Mix**: up to 3 sounds at once, each with its own volume (Create → Mix).
  Mixes can be named and saved (`src/store/mixes.ts`, on-device) and appear
  under **Your mixes**. Saved mixes store sound ids, so they keep working
  when a placeholder sound is replaced.
- **Shuffle**: one sound at a time from a set, each for 5 minutes, then an
  equal-power 4-second crossfade to the next (`SHUFFLE_TRACK_MS` in
  `src/audio/program.ts`). Every sound plays before any repeats, and never
  twice in a row. Each category has a **Shuffle** button; Create → Shuffle
  picks a custom set.

All three run on the same engine (`src/audio/engine.ts`) as a _program_
of one or more voices, so the sleep timer, fades, background heartbeats,
outside pauses and the safe-sleep reminder work the same for each. The
first voice (a mix's first layer, or shuffle's current sound) owns the
lock screen; a lock-screen pause pauses every layer.

## Sounds

White, pink and brown noise are generated in code
(`src/audio/noise.ts`, run by `scripts/generate-noise.ts`): 30-second
seamless loops with a fixed seed, so every run produces identical files and
no licence is needed. All other sounds must be CC0 or royalty-free and be
recorded in [`assets/sounds/LICENSES.md`](./assets/sounds/LICENSES.md), which
also lists the sounds still to source.

The catalogue is `src/data/sounds.ts`. Sounds not sourced yet play a shared
placeholder loop and show a **Placeholder** tag. Tests check that every
sound file exists, every real sound has a licence entry, and every
placeholder is listed as still to source.

## Testing on a phone

`.github/workflows/android-preview.yml` builds an installable test APK on
GitHub Actions (Actions tab → **Android preview build** → Run workflow) and
publishes it as a pre-release. Test builds include a **Playback check**
section in Settings with an on-device log and a 2-minute test timer. The
checklist is in [`docs/android-testing.md`](./docs/android-testing.md).

## Web app on GitHub Pages

`.github/workflows/web-pages.yml` publishes the installable web app to
**https://xsosaxdexx.github.io/Luna/** (Actions tab → **Web app (GitHub
Pages)** → Run workflow). One-time setup by the repository owner:
Settings → Pages → Build and deployment → Source: **GitHub Actions**.

The web build supports a sub-path: `EXPO_BASE_URL=/Luna npm run build:web`.
The manifest and service worker use relative paths, and `404.html` lets
Pages serve the app for deep links such as `/Luna/player`.

## Web and PWA limits

The website installs as an app and works fully offline: after each web
build, `scripts/postexport-web.mjs` writes every file (including all
sounds) into the service worker's precache list. Audio range requests are
served from the cache, which Safari needs. Playing through the night
with the screen locked is less reliable in phone browsers (iOS Safari
especially) than in the native app. Step 3 tests this on real devices and
documents the actual limits here. The app will show a gentle tip on the web
suggesting the installed app for overnight use.

Lock-screen info uses the browser's Media Session API (checked in Chromium).
Some browsers leave a tiny gap when an `<audio>` element loops; step 3
checks this on iOS Safari and Android Chrome.

## Project layout

```
src/app/          Expo Router screens: (tabs) Sounds, My Sounds, Settings; player
src/components/   Shared UI (SoundCard, TimerRing, QuickAddButtons, VolumeSlider, …)
src/audio/        Player engine, sleep timer, expo-audio output, noise generator
src/data/         Sound catalogue
src/store/        Persisted settings (volume, favorites)
src/hooks/        Small shared hooks
src/theme/        Colours, typography, spacing, motion
src/pwa/          Service worker registration (web only)
assets/brand/     Logo SVG (source) and generated icons
assets/sounds/    Bundled audio and LICENSES.md
public/           Web template, PWA manifest, service worker, PWA icons
scripts/          Icon and noise generators
```
