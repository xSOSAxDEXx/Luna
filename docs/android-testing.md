# Android device testing (build step 3)

These checks prove that Luna Beats keeps playing, and stops on time, with
the screen off, which can't be tested on a computer. Each test says what
should happen. If something else happens, note it and share the log
(Settings → Playback check → **Share log**).

## Install the test build

1. On your phone, open the repository's **Releases** page and pick the
   newest **Android test build**.
2. Under **Assets**, tap the `.apk` to download it.
3. Open the download. If Android asks, allow your browser to install apps.
4. Open **Luna Beats**. Test builds have a **Playback check** section at the
   bottom of Settings.

Before you start: Settings → Playback check → **Clear**.

## The tests

| #   | Test                                       | Steps                                                                                                      | Expected                                                                                                                                       |
| --- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Timer with screen off (most important)** | Settings → **Start 2-minute test**. Lock the phone straight away. Wait 3 minutes.                          | The sound plays, fades over the last 30 s and stops at about 2:00. Unlocking shows "Sleep well".                                               |
| 2   | **Lock-screen controls**                   | Start any sound and lock the phone. Look at the lock screen / notification.                                | It shows the sound's name and the time left (e.g. "9 min"), with no scrub bar. Pause and play there work, and the app agrees when you open it. |
| 3   | **Long play, screen off**                  | Start a sound, tap **Until I stop**, lock the phone for 15 minutes or more.                                | It keeps playing the whole time. (Android stops background audio after about 3 minutes if it's set up wrong.)                                  |
| 4   | **Real-length timer**                      | Start a sound with the normal 10-minute timer (or add time for a longer one). Lock the phone and leave it. | It stops on time. In the log, the `finish` line's `lateMs` should be under about 1000.                                                         |
| 5   | **Another app's audio**                    | Play a sound, then play a video in another app. Come back.                                                 | Luna Beats pauses while the other app plays. The player shows "Paused for a moment"; play resumes it.                                          |
| 6   | **Phone call**                             | Play a sound and have someone call you. Answer or decline, then hang up.                                   | The sound pauses during the call. Note whether it **resumes by itself** after the call or waits for you; we'll decide which we want.           |
| 7   | **Silent mode**                            | Turn on silent or vibrate, then play a sound.                                                              | It still plays.                                                                                                                                |
| 8   | **Offline**                                | Turn on airplane mode, swipe the app away, reopen it and play a sound.                                     | Everything works.                                                                                                                              |
| 9   | **Battery saver**                          | Turn on battery saver and repeat test 1.                                                                   | Same as test 1.                                                                                                                                |
| 10  | **Seamless loop**                          | Play **White noise** for a minute and listen closely around each 30-second mark.                           | No click, gap or jump where it loops.                                                                                                          |

After the tests: Settings → Playback check → **Share log**, and send it
over along with any notes (phone model and Android version help too).

## Reading the log

- `background` / `foreground`: the app left or returned to the screen.
  `heartbeats` on `foreground` is how many timer updates arrived while it
  was away. A positive number means the background timer is working.
- `finish {"lateMs": …}`: how many milliseconds after the timer's end the
  sound stopped.
- `tick-gap`: a pause of more than 5 s between timer updates while playing.
- `external-pause` / `external-resume`: something outside the app paused or
  resumed the sound (lock screen, a call, another app).
