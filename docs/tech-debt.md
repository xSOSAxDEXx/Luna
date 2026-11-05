# Technical debt

An audit of the codebase on 5 Nov 2026, scored as
**(Impact + Risk) × (6 − Effort)**, each 1–5 (higher score = do sooner).
Update this file as items are paid down.

## Summary

Debt is modest and nothing blocks feature work. The biggest risks were
process gaps, not code: most features since step 6 hadn't been run on a real
phone, and tests only ran inside hand-started builds. Phase 1 (below) is done.

## Prioritised list

| #   | Item                                                                                                                                                                                                 | Type         | I   | R   | E   | Score | Status                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --- | --- | --- | ----- | ------------------------------------------------- |
| 1   | **Device-test backlog**: recording, backup, quiet card, dim mode, volume cap, all new sounds and Harmony Tones haven't run on a real phone (Android 15–25, iPhone W1–W18; no iPhone results at all). | Test         | 4   | 5   | 2   | 36    | Phase 2 (owner)                                   |
| 2   | **No automatic checks on push**: `npm run check` only ran inside the two manual build workflows.                                                                                                     | Infra        | 3   | 4   | 1   | 35    | ✅ Done: `.github/workflows/check.yml`            |
| 3   | **Sound levels not reproducible**: levels were tuned with ffmpeg scripts kept outside the repo.                                                                                                      | Code / infra | 3   | 3   | 1   | 30    | ✅ Done: `npm run loudness`                       |
| 4   | **Launch blockers**: diagnostics log on in the web build, debug-signed APKs, placeholder app ID, no contact email.                                                                                   | Infra        | 1   | 5   | 1   | 30    | Tracked in `docs/store-listing.md`; Phase 4       |
| 5   | **Two cards named "Music box" / "Music Box"** (Music and Harmony Tones): confusing for parents and near-identical to screen readers.                                                                 | Product      | 2   | 2   | 1   | 20    | Phase 2 (needs a naming decision)                 |
| 6   | **Committed WAVs could drift** from their generators.                                                                                                                                                | Test         | 2   | 3   | 2   | 20    | ✅ Done: the Check workflow regenerates and diffs |
| 7   | **Slow tests**: the two synth test files take ~37 s of a ~45 s run.                                                                                                                                  | Test         | 3   | 1   | 2   | 16    | Phase 3                                           |
| 8   | **Duplicated UI**: modal header + close button ×4 (create, record, privacy, about-tones); radio-chip groups ×4; `create.tsx`/`record.tsx` style their own buttons instead of `Button`.               | Code         | 2   | 2   | 2   | 16    | Phase 3                                           |
| 9   | **Oversized files**: `src/app/record.tsx` (647 lines, four components) and `src/audio/music.ts` (664 lines: instruments, tunes, birds, 432 Hz pieces).                                               | Code         | 2   | 2   | 2   | 16    | Phase 3                                           |
| 10  | **Patch updates waiting** (Expo SDK 58 modules). Majors held: TypeScript 7, ESLint 10, AsyncStorage 3 wait for Expo support.                                                                         | Dependency   | 1   | 2   | 1   | 15    | ✅ Done (patches only)                            |
| 11  | **Heavy first web visit**: the service worker precaches all 33 MB of sound (11 MB of it Harmony Tones).                                                                                              | Architecture | 2   | 3   | 3   | 15    | Phase 4                                           |
| 12  | **Adding a sound touches 3–4 places**: catalogue (hand-written `require`), generator table, `LICENSES.md`, sometimes tests.                                                                          | Architecture | 2   | 2   | 3   | 12    | Phase 4                                           |
| 13  | **npm audit: 25 moderate** (deepmerge, minimatch, glob) in ESLint and the Expo CLI, not in the shipped app. Fix by updating tooling, never `--force`.                                                | Dependency   | 1   | 2   | 2   | 12    | Watch; Phase 4                                    |
| 14  | **Stale docs**: Android checklist titled "build step 3"; `PROGRESS.md` keeps growing.                                                                                                                | Docs         | 1   | 1   | 1   | 10    | ✅ Title fixed; trim PROGRESS in Phase 3          |

Not debt: `src/audio/engine.ts` is large (680 lines) but cohesive and covered
by ~50 tests. No TODOs or lint suppressions in `src/`.

## Why the top items matter

- **#1**: dim mode, the recorder, the Android Do Not Disturb intent, the
  silence-trim loop seek and backup sharing depend on real OS behaviour; a
  failure there reaches parents at night.
- **#2, #6**: every push is now checked, including that generated sounds and
  the privacy pages match their source, so regressions and drift are caught
  for free.
- **#3**: sounds that jump in volume when switching break the calm-first
  promise. `npm run loudness` re-measures all of them against their targets.

## Remediation plan

- **Phase 1 (done, 5 Nov 2026)**: Check workflow on push/PR (check +
  regenerate-and-diff); `npm run loudness`; Expo patch updates; Android
  checklist title; `scripts/generate-icons.mjs` lint fix.
- **Phase 2 (owner's schedule)**: run the device tests on the latest build;
  pick names for the two music boxes. Record results in
  `docs/device-results.md`; fix anything found.
- **Phase 3 (when next touching those files)**: faster synth tests (lower
  sample rate, shorter renders, shared renders); extract `ModalHeader` and
  `ChoiceChips`, use `Button` everywhere; split `record.tsx` and `music.ts`;
  trim `PROGRESS.md`. No behaviour changes.
- **Phase 4 (before a public web launch)**: cache sounds on first play
  (precache only the noise loops); generate catalogue, generator tables and
  licence rows from one sound manifest; clear the launch checklist; update
  tooling to clear the audit warnings.
