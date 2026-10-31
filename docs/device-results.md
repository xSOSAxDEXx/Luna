# Device test results

Results from `docs/android-testing.md` runs on real phones. Logs come from
Settings → Playback check in test builds.

## Samsung Galaxy S21+ (SM-G996U, AT&T) · Android 13 · One UI 5.1

Test build: **android-preview-2** (commit `eeb13b5`), 31 Oct 2026.

| #   | Test                   | Result   | Evidence                                                                                                                                                                                     |
| --- | ---------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1/4 | Timer with screen off  | ✅ Pass  | 10-min run finished at 13:19:39 while backgrounded (app reopened 13:19:42), **195 ms** late. 2-min runs: 78 ms and 5 ms late; the 30 s fade-out ran while backgrounded.                      |
| —   | Background heartbeats  | ✅ Pass  | ~2 per second in every background period (e.g. 538 in 254 s), so the timer and fades keep running with JS timers paused.                                                                     |
| 3   | Long play, screen off  | ✅ Pass  | Played well past Android's ~3-minute background limit (254 s continuous in the log, plus the tester's long run) without dropping out.                                                        |
| 6   | Phone call             | ✅ Pass  | Sound paused for the call, **resumed by itself** afterwards, and the timer still ended on schedule ("Sleep well" on reopening). Auto-resume kept as the intended behaviour (CLAUDE.md §3.5). |
| —   | Outside pause handling | ✅ Pass  | An outside pause at 13:11:59 was mirrored (`external-pause`); the 9 s paused were added back to the timer exactly.                                                                           |
| 2   | Lock-screen controls   | ⏳ To do |                                                                                                                                                                                              |
| 5   | Another app's audio    | ⏳ To do |                                                                                                                                                                                              |
| 7   | Silent mode            | ⏳ To do |                                                                                                                                                                                              |
| 8   | Offline                | ⏳ To do |                                                                                                                                                                                              |
| 9   | Battery saver          | ⏳ To do |                                                                                                                                                                                              |
| 10  | Seamless loop          | ⏳ To do |                                                                                                                                                                                              |

## Not yet tested

- **iPhone (iOS):** no device yet. The code paths are the same, but iOS may
  not auto-resume after a call the way Android does; check when possible.
- **Web app on a phone** (https://xsosaxdexx.github.io/Luna/): screen-off
  behaviour still to be measured; results go in the README's web limits.
