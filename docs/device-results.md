# Device test results

Results from `docs/android-testing.md` runs on real phones. Logs come from
Settings → Playback check in test builds.

## Samsung Galaxy S21+ (SM-G996U, AT&T) · Android 13 · One UI 5.1

Test build: **android-preview-2** (commit `eeb13b5`), 31 Oct 2026.

| #   | Test                   | Result  | Evidence                                                                                                                                                                                     |
| --- | ---------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1/4 | Timer with screen off  | ✅ Pass | 10-min run finished at 13:19:39 while backgrounded (app reopened 13:19:42), **195 ms** late. 2-min runs: 78 ms and 5 ms late; the 30 s fade-out ran while backgrounded.                      |
| —   | Background heartbeats  | ✅ Pass | ~2 per second in every background period (e.g. 538 in 254 s), so the timer and fades keep running with JS timers paused.                                                                     |
| 3   | Long play, screen off  | ✅ Pass | 15+ minutes on "Until I stop" with the screen locked, no dropouts (tester report). Log also shows 254 s continuous, past Android's ~3-minute limit.                                          |
| 6   | Phone call             | ✅ Pass | Sound paused for the call, **resumed by itself** afterwards, and the timer still ended on schedule ("Sleep well" on reopening). Auto-resume kept as the intended behaviour (CLAUDE.md §3.5). |
| —   | Outside pause handling | ✅ Pass | An outside pause at 13:11:59 was mirrored (`external-pause`); the 9 s paused were added back to the timer exactly.                                                                           |
| 2   | Lock-screen controls   | ✅ Pass | Tester report.                                                                                                                                                                               |
| 5   | Another app's audio    | ✅ Pass | Tester report.                                                                                                                                                                               |
| 7   | Silent mode            | ✅ Pass | Tester report.                                                                                                                                                                               |
| 8   | Offline                | ✅ Pass | Tester report.                                                                                                                                                                               |
| 9   | Battery saver          | ✅ Pass | Tester report.                                                                                                                                                                               |
| 10  | Seamless loop          | ✅ Pass | Tester report.                                                                                                                                                                               |

**Android: all tests pass on this phone.** Step 3 is complete for Android.

### Play modes (step 4)

Test build: **android-preview-3** (commit `6b9964c`), 31 Oct 2026. Log
times are the phone's (Eastern).

| #   | Test                | Result  | Evidence                                                                                                                                                                                                                                                                                                                |
| --- | ------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11  | Mix, screen off     | ✅ Pass | 3-layer mix (white noise, ocean waves, heartbeat), 10-min timer, locked at 15:37:51. Finished while backgrounded, **304 ms** late, all layers fading together (tester report); the 3 s of lock-screen pauses (15:37:54, 15:41:55) paused and resumed all layers and were added back. ~6.5 heartbeats/s (3 layers × ~2). |
| 12  | Shuffle, screen off | ✅ Pass | Noise shuffle, Until I stop, 39 min mostly locked. `shuffle-next` exactly every 5:00 (7 changes); every sound played before a repeat, never twice in a row. Kept playing to the manual stop at 16:27:25. Crossfades smooth (tester report).                                                                             |
| 13  | Saved mix           | ✅ Pass | After closing and reopening, the saved mix started from the library at 16:27:38. Edit and soft-confirm delete worked (tester report).                                                                                                                                                                                   |

**Android: step 4 passes on this phone.**

Found while reading this log: the `start` line for shuffle listed only the
first sound. Fixed after build 3; it now logs the whole set (`sounds`) and
what plays first (`playing`).

### Gentle wake-up (step 5)

**Android: step 5 passes on this phone.**

Test build: **android-preview-4** (commit `490fcf3`), 31 Oct 2026.

| #   | Test                       | Result  | Evidence                                                                                                                                                                                                                                                                                                        |
| --- | -------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14  | Gentle wake-up, screen off | ✅ Pass | Brown noise, 10-min timer, wake-up on (Auto). Locked from 17:15:43. `wake-start` at 17:17:05, **451 ms** after the timer's end; `finish` at 17:22:05, **461 ms** after the wake-up's end. Both happened in the background (~2.1 heartbeats/s). Crossfade, slow rise, sound and sunrise confirmed by the tester. |

### Recording and backup (step 6)

Test build: **android-preview-5** (step 6). Waiting for results.

| #   | Test                   | Result     | Evidence |
| --- | ---------------------- | ---------- | -------- |
| 15  | Microphone permission  | ⏳ Pending |          |
| 16  | Record and listen back | ⏳ Pending |          |
| 17  | Recording, screen off  | ⏳ Pending |          |
| 18  | Recording in a mix     | ⏳ Pending |          |
| 19  | Backup and restore     | ⏳ Pending |          |

### Calm and safety (step 7)

Test build: **android-preview-6** (step 7). Waiting for results.

| #   | Test             | Result     | Evidence |
| --- | ---------------- | ---------- | -------- |
| 20  | Welcome          | ⏳ Pending |          |
| 21  | Quiet your phone | ⏳ Pending |          |
| 22  | Dim mode         | ⏳ Pending |          |
| 23  | Soft volume cap  | ⏳ Pending |          |

### Sounds (all real, 5 Nov)

| #   | Test        | Result     | Evidence |
| --- | ----------- | ---------- | -------- |
| 24  | Every sound | ⏳ Pending |          |

## Not yet tested

- **iPhone (iOS):** no device yet. The code paths are the same, but iOS may
  not auto-resume after a call the way Android does; check when possible.
- **Web app on a phone** (https://xsosaxdexx.github.io/Luna/): screen-off
  behaviour still to be measured; results go in the README's web limits.
