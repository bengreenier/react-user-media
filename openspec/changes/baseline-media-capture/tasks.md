## 1. Spec–test coverage audit

- [x] 1.1 Map each `media-capture` scenario in `specs/media-capture/spec.md` to a test in `use-media.spec.tsx` or `close-media.spec.ts` (note any scenario without a direct test)
- [x] 1.2 Confirm user vs display acquisition scenarios match `getUserMedia` / `getDisplayMedia` spies and args
- [x] 1.3 Confirm state transition scenarios (idle, loading→ready, error, stop→idle) match existing assertions
- [x] 1.4 Confirm lifecycle scenarios (re-request close, stale after stop/re-request, unmount ready, unmount in-flight, type change) match generation/cleanup tests
- [x] 1.5 Confirm `closeMedia` and `getSupportedConstraints` scenarios match `close-media.spec.ts`

## 2. Gap documentation

- [x] 2.1 Record uncovered scenarios (if any) as follow-up test candidates without changing production code in this baseline — gaps: (a) no dedicated initial-idle assert before `request`; (b) no explicit happy-path loading→ready sequence assert; (c) no `getUserMedia` `toHaveBeenCalledWith(constraints)` assert (display has args assert); (d) no async `getUserMedia` rejection path (sync throw only); (e) no missing-`getDisplayMedia` capability test; (f) type-change covers in-flight only, not ready-held media
- [x] 2.2 Confirm proposal Non-goals still hold (no API/behavior changes implied by tasks)

## 3. Optional main-spec sync

- [x] 3.1 Decide whether to sync `media-capture` into `openspec/specs/` via archive/sync workflow (deferred — keep as change delta)
- [x] 3.2 If syncing, run the project’s OpenSpec sync/archive path so main specs mirror this baseline unchanged (deferred — keep as change delta)

## 4. Validation

- [x] 4.1 Run `OPENSPEC_TELEMETRY=0 npx --yes @fission-ai/openspec validate baseline-media-capture --json` and fix artifact issues until valid
- [x] 4.2 Run package tests for media capture (`use-media.spec.tsx`, `close-media.spec.ts`) to confirm baseline still matches green tests
