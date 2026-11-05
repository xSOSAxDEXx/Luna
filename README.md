# Luna Beatzzz

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
- **State:** Zustand. Settings, favorites, saved mixes and the list of
  recordings persist on-device with AsyncStorage. Recording audio is stored
  as files (see below).
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
- Lock-screen controls need `interruptionMode: 'doNotMix'`, so Luna Beatzzz
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

## Gentle wake-up

A switch on the player, **Gentle wake-up at the end** (off by default,
remembered). When the sleep timer ends:

1. In the sleep timer's last 30 seconds, the wake-up sound starts underneath
   and rises to 15% of the chosen volume while the sleep sound fades out.
2. For 5 minutes, it rises slowly (eased, so it stays soft at first) to the
   chosen volume, never above it. The player shows a soft sunrise; quick-add
   is hidden because the wake-up has a fixed length.
3. It fades out over the last 30 seconds and the player says "Good morning".

The wake-up sound is **Auto** (light chimes, for now) or a choice of Light
chimes, Morning birds or Playful melody. It needs a timer, so "Until I stop"
never wakes. Pausing holds the wake-up like the sleep timer. The curves are
in `src/audio/wake.ts`; the engine runs them from timestamps, so they work
with the screen off. Wake-up sounds aren't shown in the library.

## Record your own (My Sounds)

**My Sounds → Record**: a parent sings a lullaby or reads a story. The flow
is record → listen back → re-record or save → name it, with an icon and a
color. Saved recordings are cards like any other sound: one tap plays them
with the timer, and they work in mixes, shuffles, favorites and the gentle
wake-up. Each card's sliders button renames, restyles or deletes it (delete
asks for a second tap).

- **Microphone permission** is only asked for on the first tap of Record,
  after a short, warm explanation. If it was turned off, the app says how to
  switch it back on and doesn't nag.
- **Recorder:** `expo-audio`'s recorder, AAC (`.m4a`), mono, 96 kbps (about
  2 MB for a 3-minute lullaby). Anything playing stops while recording. A
  take stops by itself after 20 minutes.
- **Silence trim** (`src/recording/trim.ts`): while recording, the loudness
  level is sampled ~10 times a second. Afterwards the app finds where the
  voice starts and ends (relative to the loudest moment, so a whisper still
  counts) and loops only that part, with a little room either side. The file
  itself is never cut, so the trim can be switched off per recording.
- **Storage:** on the phone, recordings are files in the app's own documents
  folder (`src/recording/files.ts`). On the web they're kept in the browser
  (IndexedDB, `files.web.ts`), which a browser may clear (Safari after weeks
  without a visit), so the web version says so and suggests a backup.
  Nothing is uploaded anywhere.

## Backup and restore

**Settings → Backup and restore.** "Make a backup" builds one JSON file
(`luna-beats-backup-YYYY-MM-DD.json`) with settings, favorites, saved mixes
and recordings (their audio included as base64). On the phone it opens the
share sheet so the parent chooses where it goes (Files, Drive, email); on the
web it downloads. "Restore" opens a file picker and **adds** what's in the
backup: mixes and recordings already on the device are left alone, favorites
are combined, and nothing is ever deleted. Unreadable parts of a file are
skipped, not trusted (`src/backup/format.ts`).

### New dependencies (step 6)

- `expo-file-system`: stores recordings, writes the backup file and opens
  the file picker for restore (it has one built in, so no separate
  document-picker package is needed). It was already installed as part of
  Expo; now it's a direct dependency.
- `expo-sharing`: opens the phone's share sheet to save or send the backup.
  Its optional config plugin (for receiving shares from other apps) is not
  used.

Both are free Expo modules with no accounts or network use.

## Calm and safety (step 7)

- **Welcome** (`src/app/welcome.tsx`): three short pages on first launch:
  what the app does, the one-time volume and distance tip (across the room,
  soft volume, never a charger near the baby), and quieting the phone. It
  can be skipped and doesn't come back.
- **Quiet your phone** (`src/safety/quietPhone.ts`): once the safe-sleep
  reminder has been read, a soft, dismissible card says _"Before you settle
  in. Silence your phone and turn off vibration so nothing disturbs the
  little one."_ On Android its button opens Do Not Disturb (or sound
  settings); iPhones don't allow apps to open Focus, so it says where to find
  it. Settings: **Every time** (default), **Once a day**, **Never**.
- **Dim mode:** after 8 seconds without a touch while playing, the player
  fades to near-black with just the moon and the time left; a tap brings it
  back. It never dims over the safe-sleep reminder, or while paused, and it
  stays off when VoiceOver or TalkBack is on.
- **Soft volume cap** (Settings, on by default) keeps the volume at 60% or
  below; the slider shows a small mark where the cap sits. Sounds start at
  35%. The kind volume tip sits next to it in Settings.
- **Affirmations:** a small, kind line on the home screen, a different one
  after each visit elsewhere (`src/data/affirmations.ts`).

## Accessibility

- Every control has a screen-reader name; switches, radios and the volume
  slider report their state (`src/app/__tests__/accessibility.test.tsx`
  checks every screen). The web build also passes an axe scan, apart from
  the navigation library's tab bar sitting outside the page landmarks.
- Text follows the phone's text-size setting; the big timer and titles grow
  a little less so they still fit.
- Reduce motion stops the breathing moon and makes fades instant; dim mode
  stays off with VoiceOver or TalkBack. Tap targets are at least 56 px.

## Privacy and store readiness

No data leaves the device: no accounts, ads, analytics or tracking. The
policy lives in `src/legal/privacy.ts` and is shown in the app (Settings →
Privacy); `npm run privacy` writes [`docs/privacy-policy.md`](./docs/privacy-policy.md)
and `public/privacy.html` (served at
https://xsosaxdexx.github.io/Luna/privacy.html). A test fails if they're out
of date. `app.json` carries the iOS privacy manifest (no tracking, no
collected data) and blocks Android permissions the app doesn't use. Store
text, form answers and the launch checklist are in
[`docs/store-listing.md`](./docs/store-listing.md).

## Sounds

Every sound is synthesised in code and written by `npm run noise`
(`scripts/generate-noise.ts`): seamless loops with fixed seeds, so every run
produces identical files and no licence is needed.

- **Noise:** `src/audio/noise.ts` (white, pink, brown).
- **Nature and rhythmic:** `src/audio/soundscapes.ts`: rain, ocean waves,
  stream, wind, forest night, crickets; heartbeat (64 bpm), womb, shushing,
  fan, car ride, train. Built from filtered noise and soft synthesised
  events (drops, bubbles, chirps, beats). Low sounds keep some energy above
  ~150 Hz so they can be heard on a phone speaker.
- **Music and wake-up:** `src/audio/music.ts`: soft instruments made from a
  few sine partials. The lullaby, piano, harp and playful wake-up tunes are
  original; the music box plays "Twinkle, Twinkle" (traditional, public
  domain). Morning birds and light chimes (`chimes.ts`) for the wake-up.
- **Levels:** balanced by ear-weighted loudness (ffmpeg's EBU R128 meter)
  against the pink noise; `npm run loudness` re-checks every sound against
  its target: about −21.5 LUFS for steady sounds, −23 for music.
  About 22 MB of WAV in total (WAV, because compressed formats leave a gap at
  the loop point on some phones).

- **Harmony Tones:** `src/audio/harmony.ts` and the 432 Hz pieces in
  `music.ts`, written by `npm run harmony` (`scripts/generate-harmony.ts`)
  into `assets/sounds/harmony/`: 174, 396, 528 and 639 Hz tones, an Om
  drone (136.1 Hz), a soft singing bowl, and music box and slow piano
  lullabies tuned to A = 432 Hz (72 and 60 bpm). Never a bare sine: quiet
  harmonics, faint slowly drifting voices, a very shallow 10 s swell, a
  1.4–1.6 kHz low-pass and a texture far underneath. Mono (no binaural or
  isochronic content). Levelled to −25 LUFS, a little under the music.
  Cards show the frequency as a quiet subtitle; the ⓘ on the category opens
  "About these tones". No health claims anywhere: a test fails if words like
  "heal", "cure", "toxin", "DNA" or "therapy" appear in app text, docs for
  the stores, or code comments.
- **Ready-made mixes:** "Rain + 528", "Ocean + Singing Bowl" and "Brown
  Noise + 174" are saved mixes like the parent's own (edit or delete). Added
  once, on a new install or when updating; a deleted one never comes back.

The catalogue is `src/data/sounds.ts`, with every file listed in
[`assets/sounds/LICENSES.md`](./assets/sounds/LICENSES.md). Any sound can
later be swapped for a recorded CC0 or royalty-free one; until its audio is
ready a sound can be marked `placeholder: true` to show a **Placeholder**
tag. Tests check every file exists and has a licence row, and that each
synthesised sound is soft, loops without a click, and is repeatable.

## Checks on every push

`.github/workflows/check.yml` runs on every push and pull request:
`npm run check` (typecheck, lint, format, tests), then regenerates every
generated file (`npm run noise`, `npm run harmony`, `npm run privacy`) and
fails if anything differs from what's committed. Known debt and the plan to
pay it down: [`docs/tech-debt.md`](./docs/tech-debt.md).

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

iPhone testing currently uses the web app in Safari (no Apple Developer
account yet); the checklist is in
[`docs/iphone-web-testing.md`](./docs/iphone-web-testing.md). The Pages
build shows the Playback check log for testing; **remove
`EXPO_PUBLIC_DIAGNOSTICS` from `web-pages.yml` before launch.**

Lock-screen info uses the browser's Media Session API (checked in Chromium).
Some browsers leave a tiny gap when an `<audio>` element loops; step 3
checks this on iOS Safari and Android Chrome.

## Project layout

```
src/app/          Expo Router screens: (tabs) Sounds, My Sounds, Settings; player, create, record
src/components/   Shared UI (SoundCard, TimerRing, QuickAddButtons, VolumeSlider, …)
src/audio/        Player engine, sleep timer, expo-audio output, noise generator
src/data/         Sound catalogue
src/recording/    Recording storage (native and web), recorder settings, silence trim
src/backup/       Backup file format, export and restore
src/store/        Persisted settings, favorites, mixes, recordings
src/hooks/        Small shared hooks
src/theme/        Colours, typography, spacing, motion
src/pwa/          Service worker registration (web only)
assets/brand/     Logo SVG (source) and generated icons
assets/sounds/    Bundled audio and LICENSES.md
public/           Web template, PWA manifest, service worker, PWA icons
scripts/          Icon and noise generators
```
