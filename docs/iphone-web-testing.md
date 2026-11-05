# iPhone testing (web app in Safari)

Until there's an Apple Developer account for a native iPhone build, the
iPhone runs the **web app**: https://xsosaxdexx.github.io/Luna/

These tests measure how far Safari lets a web app play overnight with the
screen locked. Phone browsers are stricter than apps, so some "fails" are
expected: they become the documented limits in the README and the reason
for the in-app tip suggesting the installed app.

## Set up

1. Open the link in **Safari** (not Chrome; on iPhone only Safari can add
   a web app to the Home Screen properly).
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Open **Luna Beatzzz** from the Home Screen icon (not from Safari).
4. Settings → **Playback check** → **Clear**.

Note your iPhone model and iOS version (Settings → General → About).

## The tests

| #   | Test                                | Steps                                                                                                                  | What to note                                                                                     |
| --- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| W1  | **Plays at all**                    | Tap **Brown noise**, then **I understand**.                                                                            | Does sound start? Is the safe-sleep reminder shown?                                              |
| W2  | **Timer, screen on**                | Settings → **Start 2-minute test**. Keep the screen on.                                                                | Fades and stops at about 2:00?                                                                   |
| W3  | **Timer, screen locked (key test)** | **Start 2-minute test**, lock the phone straight away, wait 3 minutes.                                                 | Does sound keep playing when locked? Does it stop at about 2:00, or keep going until you unlock? |
| W4  | **Long play, locked**               | Start a sound, tap **Until I stop**, lock for 15 minutes.                                                              | Does it play the whole time, or stop after a while? Roughly when?                                |
| W5  | **Lock-screen controls**            | Start a sound and lock the phone.                                                                                      | Does the lock screen show "Luna Beatzzz" / the sound? Do pause and play work there?                |
| W6  | **Switching apps**                  | Play a sound, open another app for a minute, come back.                                                                | Keeps playing in the background?                                                                 |
| W7  | **Silent switch**                   | Flip the ring/silent switch to silent, then play.                                                                      | Does it still play? (Safari often goes quiet on silent.)                                         |
| W8  | **Offline**                         | Open it once online, then turn on airplane mode, close it from the app switcher, reopen from the Home Screen and play. | Does it open and play with no internet?                                                          |
| W9  | **Mix and shuffle**                 | Create → Mix with 3 sounds; then Shuffle next to Noise.                                                                | Do all layers play together? Does shuffle play?                                                  |
| W10 | **Seamless loop**                   | Play **White noise** for a minute.                                                                                     | Any click or gap around each 30-second mark?                                                     |
| W11 | **Gentle wake-up**                  | Start a sound, switch on **Gentle wake-up at the end**, keep the screen on until the timer ends, then wait 5 minutes.  | Do chimes come in softly as the sound fades, rise slowly, and end with "Good morning"?           |
| W12 | **Record**                          | My Sounds → **Record**, allow the microphone, record 20 s, **Listen back**, Save.                                      | Does Safari ask for the microphone? Does listening back and playing the card work?               |
| W13 | **Recording kept**                  | Close Safari (or the Home Screen app) fully, reopen My Sounds later.                                                   | Is the recording still there and playable?                                                       |
| W14 | **Backup and restore**              | Settings → **Make a backup** (saves to Files → Downloads). Delete the recording, then **Restore** and pick the file.   | Does the file save? Does restore bring the recording back?                                       |
| W15 | **Welcome and quiet card**          | Open the site in a private tab. Then play a sound and tap **I understand**.                                            | Do the welcome pages show? Does the quiet-your-phone card show, with the Focus hint?             |
| W16 | **Dim mode**                        | Play a sound and don't touch the screen for 10 s.                                                                      | Does it fade to near-black with the moon and time? Does a tap bring it back?                     |

When you're done: Settings → Playback check → **Share log**, and send it
along with your notes for each test.

## Reading the log

Same as Android (see `android-testing.md`). On iPhone the key question is
whether `heartbeats` keep arriving while the screen is locked, and whether
`finish` happens before `foreground` (stopped on time while locked) or
only after it (Safari paused the app until you came back).
