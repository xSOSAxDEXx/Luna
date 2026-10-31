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

| #   | Test                                       | Steps                                                                                                                                                                              | Expected                                                                                                                                                                                             |
| --- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Timer with screen off (most important)** | Settings → **Start 2-minute test**. Lock the phone straight away. Wait 3 minutes.                                                                                                  | The sound plays, fades over the last 30 s and stops at about 2:00. Unlocking shows "Sleep well".                                                                                                     |
| 2   | **Lock-screen controls**                   | Start any sound and lock the phone. Look at the lock screen / notification.                                                                                                        | It shows the sound's name and the time left (e.g. "9 min"), with no scrub bar. Pause and play there work, and the app agrees when you open it.                                                       |
| 3   | **Long play, screen off**                  | Start a sound, tap **Until I stop**, lock the phone for 15 minutes or more.                                                                                                        | It keeps playing the whole time. (Android stops background audio after about 3 minutes if it's set up wrong.)                                                                                        |
| 4   | **Real-length timer**                      | Start a sound with the normal 10-minute timer (or add time for a longer one). Lock the phone and leave it.                                                                         | It stops on time. In the log, the `finish` line's `lateMs` should be under about 1000.                                                                                                               |
| 5   | **Another app's audio**                    | Play a sound, then play a video in another app. Come back.                                                                                                                         | Luna Beats pauses while the other app plays. The player shows "Paused for a moment"; play resumes it.                                                                                                |
| 6   | **Phone call**                             | Play a sound and have someone call you. Answer or decline, then hang up.                                                                                                           | The sound pauses during the call. It should **resume by itself** after the call, and the call time shouldn't count against the timer.                                                                |
| 7   | **Silent mode**                            | Turn on silent or vibrate, then play a sound.                                                                                                                                      | It still plays.                                                                                                                                                                                      |
| 8   | **Offline**                                | Turn on airplane mode, swipe the app away, reopen it and play a sound.                                                                                                             | Everything works.                                                                                                                                                                                    |
| 9   | **Battery saver**                          | Turn on battery saver and repeat test 1.                                                                                                                                           | Same as test 1.                                                                                                                                                                                      |
| 10  | **Seamless loop**                          | Play **White noise** for a minute and listen closely around each 30-second mark.                                                                                                   | No click, gap or jump where it loops.                                                                                                                                                                |
| 11  | **Mix, screen off**                        | Create → Mix: pick 3 sounds, Save & play. Use **+5 min** etc. or leave the 10-minute timer. Lock the phone.                                                                        | All three layers play together and fade out together when the timer ends. Lock-screen pause/play pauses and resumes **all** layers.                                                                  |
| 12  | **Shuffle, screen off**                    | Tap **Shuffle** next to Noise. Tap **Until I stop**, lock the phone for 12+ minutes.                                                                                               | About every 5 minutes the sound softly crossfades (≈4 s) to another noise; no gaps or jumps. The lock screen shows the current sound. Log shows `shuffle-next` lines.                                |
| 13  | **Saved mix**                              | Close the app fully, reopen.                                                                                                                                                       | The saved mix is under **Your mixes**; one tap plays it. The sliders icon edits it; **Delete mix** asks you to tap again.                                                                            |
| 14  | **Gentle wake-up, screen off**             | Start a sound, switch on **Gentle wake-up at the end** (leave it on Auto) and keep the normal 10-minute timer. Lock the phone and wait until about 6 minutes after the timer ends. | Near the end the sound fades while soft chimes come in; the chimes rise slowly for 5 minutes, then fade out. Unlocking shows a sunrise and "Good morning". The log shows `wake-start` then `finish`. |
| 15  | **Microphone permission**                  | My Sounds → **Record**.                                                                                                                                                            | A short explanation shows first. **Allow microphone** brings up Android's prompt; after allowing, the big microphone button appears. Next time, no explanation or prompt.                            |
| 16  | **Record and listen back**                 | Record about 30 s: stay quiet for 3–4 s, sing or read, then 3–4 s quiet again. Stop. **Listen back**, try **Re-record** once, then name it, pick an icon and color, and **Save**.  | Listening back is clear, starting near your first word. The card appears in My Sounds (and under My Sounds in the Sounds tab) with its length.                                                       |
| 17  | **Recording, screen off**                  | Tap your recording, keep the 10-minute timer, lock the phone.                                                                                                                      | It loops with no long silent gap between repeats, and fades out at the end like any sound. Log: `recording-saved` (with `trimmedSeconds`) and `finish`.                                              |
| 18  | **Recording in a mix**                     | Create → Mix: **Rain** plus your recording, Save & play.                                                                                                                           | Both play together; each layer's slider works.                                                                                                                                                       |
| 19  | **Backup and restore**                     | Settings → **Make a backup**, save it to Files or Drive. Then delete your recording (sliders button → **Delete recording**, tap again). Settings → **Restore**, pick the backup.   | "Restored 1 recording…". The recording is back in My Sounds and plays; saved mixes and favorites are still there.                                                                                    |
| 20  | **Welcome**                                | Clear the app's storage (Settings → Apps → Luna Beats → Storage → Clear data), then open it.                                                                                       | Three short welcome pages, then the library. Reopening the app doesn't show them again.                                                                                                              |
| 21  | **Quiet your phone**                       | Play a sound and tap **I understand**. Tap **Open Do Not Disturb**.                                                                                                                | A soft card says to silence the phone. The button opens Do Not Disturb (or sound settings). Dismissed cards stay away for that play. Try Settings → **Once a day**.                                  |
| 22  | **Dim mode**                               | Play a sound, read the reminder, then don't touch the screen for 10 s. Tap once.                                                                                                   | The player fades to near-black with the moon and the time left; one tap brings it back. Never dims while the safety reminder shows.                                                                  |
| 23  | **Soft volume cap**                        | On the player, drag the volume all the way right. Then Settings → switch off **Soft volume cap** and try again.                                                                    | With the cap on the slider stops at the small mark (60%); off, it goes to the end. Switching the cap back on lowers a loud volume.                                                                   |

After the tests: Settings → Playback check → **Share log**, and send it
over along with any notes (phone model and Android version help too).

## Reading the log

- `background` / `foreground`: the app left or returned to the screen.
  `heartbeats` on `foreground` is how many timer updates arrived while it
  was away. A positive number means the background timer is working.
- `finish {"lateMs": …}`: how many milliseconds after the timer's end the
  sound stopped.
- `tick-gap`: a pause of more than 5 s between timer updates while playing.
- `shuffle-next`: shuffle crossfaded to the next sound.
- `wake-start`: the sleep timer ended and the gentle wake-up began
  (`lateMs` as for `finish`).
- `recording-saved`: a recording was saved (`seconds` long, `trimmedSeconds`
  of quiet trimmed from its loop). `mic-permission`: the microphone answer.
- `backup-export` / `backup-restore`: how many recordings and mixes went
  into, or came back from, a backup.
- `external-pause` / `external-resume`: something outside the app paused or
  resumed the sound (lock screen, a call, another app).
