## 1. Spec ↔ test audit

- [x] 1.1 Map each scenario in `specs/media-recorder/spec.md` to a case in `use-media-recorder.spec.tsx` (or mark uncovered)
  - Covered: idle; default/explicit timeslice; pause/resume; finalize empty segments; userMedia integration; restart cleanup (implies default concat); deferred handler invalidation; late error ignore; constructor/`start`/native error; clear error on new start
  - Uncovered: Cleanup on unmount (see 3.1)
- [x] 1.2 Confirm public exports (`useMediaRecorder`, `RecorderOptions`, `RecorderState`) match proposal/design; confirm `useMediaRecorderState` / `useMediaRecorderError` remain non-exported
- [x] 1.3 Confirm state flags and actions in the spec match the discriminated union and callbacks in `use-media-recorder.ts`

## 2. Lifecycle verification

- [x] 2.1 Run `use-media-recorder` Vitest suite (idle, timeslice, pause/resume, finalize empty segments, restart cleanup, deferred handler invalidation, late error ignore) — 12/12 passed
- [x] 2.2 Run error-path cases (constructor throw, `start` throw, native `error` event, clear error on new start) — included in suite pass
- [x] 2.3 Run integration case `records userMedia video` (or document environment skip if browser mode unavailable) — passed (343ms)

## 3. Coverage gaps (document only)

- [x] 3.1 Note whether unmount cleanup has a dedicated test; if missing, record as follow-up (do not implement in this baseline) — gap: no dedicated unmount test; impl has `useEffect` → `cleanupCurrentRecorder`; follow-up
- [x] 3.2 Note whether `startTime` / `endTime` are asserted beyond `isFinalized`; record follow-up if desired — gap: tests assert `isFinalized` only; no direct `startTime`/`endTime` assertions; follow-up

## 4. Optional archive prep

- [x] 4.1 Decide whether to sync this capability into `openspec/specs/media-recorder/` (out of scope unless explicitly requested) (deferred — keep as change delta)
- [x] 4.2 Validate change with `openspec validate baseline-media-recorder` before archive — valid
