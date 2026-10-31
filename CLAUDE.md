# Luna Beats — Claude Code Kickoff Prompt

> Paste this into Claude Code from the root of the `Luna` repo (https://github.com/xSOSAxDEXx/Luna), or commit it as `CLAUDE.md` so it stays as standing project context. The repo is currently empty.

---

## 1. What we're building

**Luna Beats** is a calm, simple sleep-sound tool for babies, shipped as a **mobile app (iOS App Store + Google Play)** and a **website** from one codebase. A tired parent opens it, taps one sound, and the baby gets soothing audio on a timer — nothing more complicated than that.

Core promise: **one tap to calm.** Every decision should make the app quieter, softer, and easier to use one-handed in a dark room while holding a baby.

This is a sibling project to my diet & fitness app (**Fuel**). Mirror its stack, structure, and conventions wherever they apply — especially the meditation/breathing feature, which is the closest relative to this app (audio playback, timers, calm UI).

## 2. Tech stack (match Fuel)

- **React Native + Expo + TypeScript** (latest stable Expo SDK), with **Expo Router**
- **Web version** from the same codebase (Expo web), installable as a **PWA**
- **Local-first data** — no account required to use the app. Store settings, favorites, mixes, and recordings on-device. Provide **backup/restore** (export/import a file) the same way Fuel does. Supabase is *optional* and only for a later sync phase — do not block v1 on it.
- Audio: use `expo-audio` (playback + recording) if it fully supports background/lock-screen playback on the current SDK; otherwise use `react-native-track-player` for playback. Check current docs and pick one; explain the choice in the README.
- State: lightweight (Zustand or React context — whichever Fuel uses).
- Lint/format/test setup identical to Fuel (ESLint, Prettier, Jest + React Native Testing Library).

If something in Fuel conflicts with this doc, ask me before deviating.

## 3. Features (v1)

### 3.1 Sound library
- Grid of large, soft cards. Each card: gentle icon/illustration, name, category tint. One tap = play.
- Categories:
  - **Noise:** white, pink, brown noise
  - **Nature:** rain, ocean waves, stream, wind, forest night, crickets
  - **Rhythmic:** heartbeat, womb/whoosh, shushing, fan, car ride, train
  - **Music:** soft lullaby melodies, music box, gentle piano/harp loops
  - **My Sounds:** user recordings (see 3.6)
- Favorites (heart) pinned to the top.
- **Licensing:** only CC0 / royalty-free assets with license info recorded in `assets/sounds/LICENSES.md`. White/pink/brown noise may be generated procedurally instead of bundled. Use clearly-marked placeholder files where real assets aren't sourced yet, and list them in a TODO.
- All sound loops must be **seamless** (no click/gap at the loop point).

### 3.2 Playback + timer
- Tapping a sound starts playback immediately **and** starts a **10-minute timer** by default.
- Big, readable countdown ring (calm, not ticking/anxious).
- **Quick-add buttons:** `+5 min`, `+10 min`, `+15 min`, `+30 min` — each tap adds time instantly. Also `Until I stop` (no timer).
- Pause / resume / stop. Volume slider.
- At timer end: **fade out over ~30 seconds** — never a hard stop.

### 3.3 Play modes
- **Loop** — repeat the single selected sound.
- **Mix** — layer up to 3 sounds (e.g., rain + heartbeat + music box) with per-layer volume. Mixes can be saved and named, and appear in the library.
- **Shuffle** — rotate through a chosen set (or a category) with soft crossfades between tracks.

### 3.4 Wake-up cycle (optional)
- Toggle on the player: **"Gentle wake-up at the end."**
- When the sleep timer ends, play a **5-minute wake-up phase**: crossfade from the sleep sound into brighter, more active sounds (morning birds, light chimes, playful soft melody), with volume rising slowly from low.
- Show a soft sunrise visual during this phase. User can pick the wake-up sound or leave it on "auto."

### 3.5 Must work offline, screen off, and in background
- All built-in sounds are **bundled with the app** — zero network needed to play.
- **Native:** audio continues with the screen locked and when switching apps. Configure iOS `UIBackgroundModes: audio` and the Android foreground media service. Lock-screen / notification controls (play/pause, time remaining) via the media session.
- The timer must keep accurate time in the background (compute from timestamps, not JS intervals that get throttled).
- Handle interruptions gracefully (phone call, other app audio): pause, then offer resume.
- **Web/PWA:** service worker caches the app shell and all sound files for offline use; use the Media Session API for lock-screen controls. Background playback on mobile browsers (especially iOS Safari) is less reliable than native — test it and document the real limits in the README, and show a gentle in-app tip on web suggesting the installed app for best overnight results.

### 3.6 Record your own (lullabies & stories)
- "Record" button in My Sounds: a parent can sing a lullaby or read a story.
- Simple flow: record → listen back → re-record or save → name it (and pick an icon/color).
- Saved recordings live **on-device**, appear as cards like any built-in sound, and support loop/mix/shuffle/timer exactly the same way.
- Optional light trim of silence at start/end. Rename and delete (with a soft confirm).
- Request microphone permission with a warm explanation, only when they first tap Record.
- Included in backup/restore.

### 3.7 "Quiet your phone" reminder
- When a sound starts, show a soft, dismissible card: *"Before you settle in — silence your phone and turn off vibration so nothing disturbs the little one."*
- On native, include a button that opens the device's Do Not Disturb / sound settings where the OS allows it.
- Settings option: show every time (default) / once per day / never.

### 3.8 Volume safety (gentle, not preachy)
- Default to a low starting volume.
- A one-time, kind tip in onboarding and in Settings: keep the device across the room from the crib rather than right next to it, and at a soft volume. Optional "soft volume cap" toggle, on by default.

### 3.9 Safe-sleep reminder (required — child safety)
- Every time a sound is started, show a safe-sleep reminder on the player: keep the phone a safe distance from the baby (across the room, never in or on the crib, bassinet or bed), and never leave a phone or charger plugged in near the baby (cord strangulation risk; charging phones get hot). Keep the volume soft.
- The sound starts immediately (one tap to calm); the reminder sits in place of the timer ring until the parent taps "I understand".
- It must never be removable or switched off in settings. The same guidance is always visible in Settings.
- Treat child safety as a hard requirement: any change that would weaken or hide this reminder needs my explicit approval.

## 4. Design — calm, gentle, reassuring

Baby sleep is stressful. The app should feel like a deep breath.

- **Night-first:** dark theme by default (deep dusk navy / indigo), soft lavender and warm moon-gold accents, low contrast glow rather than bright white. No pure white or bright blue anywhere in night mode. A light "daytime" theme can follow.
- **Dim mode while playing:** after a few seconds of no touch, the player dims to a near-black screen with just the moon and remaining time. Tap to wake.
- **Big tap targets** (min 56px), usable one-handed, thumb-reachable controls at the bottom.
- **Slow, soft motion:** gentle fades and breathing-paced animations (borrow from Fuel's breathing feature). No flashing, bouncing, or sharp sounds. Haptics off by default.
- **Rounded, friendly typography** (e.g., Nunito or Quicksand), generous spacing.
- **Reassuring microcopy** sprinkled lightly: "You're doing great." / "Rest is on its way." / "One breath at a time." Rotate a small affirmation on the home screen. Never guilt, never streaks, never pressure.
- Accessibility: screen-reader labels on every control, respects reduced-motion and dynamic type.

### Logo & name
- Name: **Luna Beats**
- Logo: a **crescent moon in a night sky, with small music notes as the stars** around it. Build it as an SVG (works for app icon, splash screen, favicon, and PWA icons). Soft gold moon, lavender/cream notes, deep indigo sky. Generate all required icon sizes for iOS, Android (adaptive icon), and web.

## 5. Suggested structure

Follow Fuel's folder layout. If starting fresh, something like:

```
app/                 # Expo Router screens: (tabs)/index (library), player, my-sounds, record, settings
src/components/      # SoundCard, TimerRing, QuickAddButtons, ModeToggle, MixerPanel, QuietPhoneCard
src/audio/           # player engine, mixer, crossfade, timer, wake-up cycle, background config
src/recording/       # recorder, storage, trim
src/store/           # settings, favorites, mixes, recordings
src/theme/           # colors, typography, motion tokens
src/data/sounds.ts   # sound catalog (id, name, category, file, icon, loop info, license)
assets/sounds/       # bundled audio + LICENSES.md
assets/brand/        # logo SVG + generated icons
```

## 6. Build order

1. **Scaffold** Expo + TS + Router + web/PWA, theme tokens, logo SVG and icons, lint/test. Push to `main`.
2. **Library + single-sound playback** with the 10-min timer, quick-add buttons, fade-out.
3. **Background / lock-screen / offline** on iOS, Android, and web — verify on real devices before moving on.
4. **Loop / Mix / Shuffle** modes and saved mixes.
5. **Wake-up cycle.**
6. **Recording** (My Sounds) + backup/restore.
7. **Quiet-phone reminder, dim mode, volume safety, onboarding, affirmations.**
8. Polish, accessibility pass, store-readiness (privacy policy: no data leaves the device; microphone usage strings).

After each step: run tests, commit with a clear message, and give me a short summary of what changed and anything that needs my decision.

## 7. Ground rules

- Ask before adding paid services, analytics, ads, or accounts. v1 collects **no personal data**.
- Keep dependencies minimal; explain any new one.
- Don't invent features beyond this doc without asking — suggest them instead.
- When anything about structure or conventions is unclear, mirror the Fuel project; if Fuel doesn't answer it, ask me.

**Start with step 1. Before writing code, give me a short plan for step 1 and the audio library choice (section 2) for approval.**
