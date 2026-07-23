## 1. Spec–test coverage audit

- [x] 1.1 Map each `media-tracks` scenario in `specs/media-tracks/spec.md` to a test in `use-media-ext.spec.tsx` or `use-track-mute-state.spec.tsx` (note any scenario without a direct test)
  - remove → `updates media tracks when a track is removed`
  - replace-at-same-count → `updates media tracks when a track is replaced at the same count`
  - undefined media → `returns a stable empty array when media becomes undefined`
  - empty stream → `returns a frozen empty array for an empty MediaStream`
  - frozen empty / shared immutable → `does not poison empty track snapshots when a caller mutates one`
  - previous-stream events ignored → `ignores track events from a previous media stream after rerender`
  - audio kind stability → `keeps audio track references stable when only video tracks change`
  - video kind stability → `keeps video track references stable when only audio tracks change`
  - initial muted → `useTrackMuteState starts muted when the track is muted`
  - mute/unmute events → `useTrackMuteState reflects muted and unmute events`
  - previous-track events ignored → `useTrackMuteState ignores mute events from a previous track`
  - observational ownership → no dedicated test; confirmed via `use-media-ext.ts` (subscribe/read only)
- [x] 1.2 Confirm all-track scenarios (remove, replace-at-same-count, undefined media, empty stream, frozen empty, previous-stream events ignored) match `useMediaTracks` tests
- [x] 1.3 Confirm kind-filter stability scenarios match `useMediaAudioTracks` / `useMediaVideoTracks` tests
- [x] 1.4 Confirm mute-state scenarios (initial muted, mute/unmute events, previous-track events ignored) match `useTrackMuteState` tests
- [x] 1.5 Confirm observational-ownership scenario is consistent with implementation (no `stop()` / stream release in `use-media-ext.ts`)

## 2. Gap documentation

- [x] 2.1 Record uncovered scenarios (if any) as follow-up test candidates without changing production code in this baseline
  - Spec scenarios: none uncovered (all 12 have a direct test or code-inspection confirmation for ownership).
  - Optional follow-ups (not spec gaps): `useMediaAudioTracks`/`useMediaVideoTracks` with `undefined` media; explicit assertion that hooks never call `track.stop()`.
- [x] 2.2 Confirm proposal Non-goals still hold (no API/behavior changes implied by tasks)

## 3. Optional main-spec sync

- [x] 3.1 Decide whether to sync `media-tracks` into `openspec/specs/` via archive/sync workflow (deferred — keep as change delta)
- [x] 3.2 If syncing, run the project’s OpenSpec sync/archive path so main specs mirror this baseline unchanged (deferred — keep as change delta)

## 4. Validation

- [x] 4.1 Run `OPENSPEC_TELEMETRY=0 npx --yes @fission-ai/openspec validate baseline-media-tracks --json` and fix artifact issues until valid
- [x] 4.2 Run package tests for media tracks (`use-media-ext.spec.tsx`, `use-track-mute-state.spec.tsx`) to confirm baseline still matches green tests
