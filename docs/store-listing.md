# Store listing and review answers (draft)

Draft text and form answers for Google Play and the App Store. Items marked
**Decide** need the owner.

## Listing text

- **Name:** Luna Beatzzz
- **Subtitle (App Store, 30 max):** Gentle sleep sounds for baby
- **Short description (Google Play, 80 max):** Soothing sounds, a gentle
  timer and your own lullabies. One tap to calm.
- **Full description:**

> Luna Beatzzz is a calm, simple sleep-sound app for babies, made for tired
> parents. Tap one sound and it plays straight away, with a 10-minute timer
> that fades out slowly. Never a sudden stop.
>
> • White, pink and brown noise, nature, rhythmic sounds and soft music
> • Add time with one tap, or play until you stop
> • Mix up to three sounds, or shuffle with soft crossfades
> • Record your own lullabies and stories, in your voice
> • Optional gentle wake-up with a soft sunrise
> • Works offline, with the screen off and from the lock screen
> • Dark, dim and easy to use one-handed in a dark room
>
> Safe sleep matters: Luna Beatzzz reminds you to keep your phone across the
> room, never in or on the crib, and never to leave a phone or charger
> plugged in near your baby. A soft volume cap is on by default.
>
> Private by design: no accounts, ads, analytics or tracking. Everything you
> make stays on your device.

Avoid medical claims (e.g. "treats colic", "prevents SIDS") in all store text.

## Categories and ratings

- **Google Play category:** Parenting.
- **App Store category:** **Decide**: Lifestyle (suggested) or Health &
  Fitness.
- **Content rating:** Everyone (Play questionnaire: no violence, no user
  interaction, no sharing, no location, no purchases); App Store 4+.
- **Google Play target audience:** 18 and over (the app is for parents and
  caregivers). Not designed for children to use themselves.

## Privacy answers

- **Privacy policy URL:** https://xsosaxdexx.github.io/Luna/privacy.html
  (generated from `src/legal/privacy.ts`; also in the app under Settings →
  Privacy).
- **Google Play Data safety:** the app collects no data and shares no data.
  Recordings are processed only on the device and never leave it.
- **App Store App Privacy:** Data Not Collected. Tracking: No. The iOS
  privacy manifest in `app.json` declares no tracking and no collected data.

## Permissions and why

| Permission                                  | Why                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| Microphone (`RECORD_AUDIO`, iOS microphone) | Only while recording a lullaby or story; explained before asking.        |
| Foreground service (media playback)         | Keeps the sleep sound and timer going with the screen off.               |
| Modify audio settings                       | Audio focus, so calls and other apps pause the sound politely.           |
| Internet                                    | Not used by the app; added by default by React Native. **Decide** below. |

Blocked on purpose (`android.blockedPermissions`): draw over other apps,
vibrate, read/write shared storage.

Google Play's foreground service declaration: type **mediaPlayback**, used
to play sleep sounds the user started, with lock-screen controls.

iOS microphone text (`app.json`): "Luna Beatzzz uses the microphone only when
you record a lullaby or story for your little one. Recordings stay on your
device." Background audio: `UIBackgroundModes: audio`.
`ITSAppUsesNonExemptEncryption` is false (no encryption beyond the OS).

## Screenshots to take (phone, night theme)

1. Library with favorites and a saved mix
2. Player with the timer ring (after the safe-sleep reminder)
3. Mix with three layer sliders
4. My Sounds with a recording
5. Gentle wake-up sunrise
6. Dim mode

## Before launch

- [ ] **Decide** the final app ID (`com.lunabeats.app` is a placeholder; it
      can't change after the first store upload).
- [ ] **Decide** a contact email for the privacy policy and store listings
      (`PRIVACY_CONTACT` in `src/legal/privacy.ts`, then `npm run privacy`).
- [ ] **Decide** whether to remove the Internet permission from Android
      (nothing in the app uses it).
- [ ] Replace placeholder sounds with CC0/royalty-free recordings
      (`assets/sounds/LICENSES.md`).
- [ ] Remove `EXPO_PUBLIC_DIAGNOSTICS` from `.github/workflows/web-pages.yml`
      and make sure store builds don't set it (no Playback check log).
- [ ] Release signing key for Google Play (test APKs use the debug key) and
      an Apple Developer account for iOS ($99/yr; ask first).
- [ ] Safe-sleep wording reviewed by someone with child-safety expertise.
- [ ] Bump `version`, `android.versionCode` and `ios.buildNumber` for each
      store upload.
