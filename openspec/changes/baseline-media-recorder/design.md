## Context

`@bengreenier/react-user-media` already exports `useMediaRecorder`, `RecorderOptions`, and `RecorderState` from `packages/react-user-media/src/hooks/use-media-recorder.ts`. This change baselines that as-built design for OpenSpec; no runtime changes are intended.

The hook wraps the browser `MediaRecorder` API behind a discriminated React state surface (idle / recording / paused / finalized / error) with explicit start/stop/pause/resume actions. It does not obtain or own the `MediaStream` lifecycle—that belongs to media-capture (`useMedia` / `closeMedia`).

## Goals / Non-Goals

**Goals:**

- Document the current architecture: session id invalidation, recorder cleanup refs, external-store state observation, and error observation
- Align design narrative with `use-media-recorder.spec.tsx` and public types
- Give future deltas a stable place to record intentional changes

**Non-Goals:**

- Redesigning the hook, exposing internal helpers, or adding WebCodecs/workers
- Changing public API or test behavior as part of this baseline
- Owning stream acquisition or track mute (other capabilities)

## Decisions

### Discriminated `RecorderState` union

**Choice:** Public return type is a union of idle, recording, paused, finalized, and error shapes with boolean flags (`isError`, `isRecording`, `isPaused`, `isFinalized`) plus times and `segments`.

**Rationale:** Matches the library convention of typed lifecycle states; consumers can narrow on flags. Runtime returns a single object cast to the union (`satisfies ShallowShapeOf<RecorderState>`) to avoid per-render checks.

**Alternatives considered:** A single `status: "idle" | ...` enum string—more compact but not how the shipped API works.

### Session id for stale-event isolation

**Choice:** `sessionIdRef` increments on every cleanup (restart and unmount). `dataavailable` handlers, segment `callback`s, stop completion, and error observers compare against the session id captured at subscription/start.

**Rationale:** Restarts and async custom handlers can deliver late events; without session gating, old blobs/errors corrupt the new session (covered by lifecycle tests).

**Alternatives considered:** Relying only on removing listeners—insufficient when custom handlers defer `callback` after restart.

### Internal observation hooks

**Choice:** `useMediaRecorderState` uses `useSyncExternalStore` on `start`/`stop`/`pause`/`resume` to mirror `MediaRecorder.state`. `useMediaRecorderError` listens for `error` events and stores `{ error, sessionId }`. Both are module-private (not exported).

**Rationale:** Keeps public API to `useMediaRecorder` while syncing browser events into React; session-tagged errors avoid late previous-session errors after restart.

### Options: `timeslice` + `dataAvailableHandler`

**Choice:** `RecorderOptions` extends `MediaRecorderOptions` with optional `timeslice` (passed to `start`) and optional `dataAvailableHandler(ev, callback)`. Default handler concatenates `ev.data` onto `segments`.

**Rationale:** Covers common chunked recording and advanced consumers without forking the MediaRecorder options surface.

### Cleanup ownership

**Choice:** `cleanupCurrentRecorder` bumps session id, removes `dataavailable` listener, and `stop()`s if not inactive. Invoked before each `startRecording` and on unmount via `useEffect` cleanup. `stopRecording` itself waits for the `stop` event (once, session-gated) before setting `endTime` / finalized.

**Rationale:** Prevents leaked recorders and ensures finalized timing follows the browser stop lifecycle; empty segment lists still finalize.

### Error paths on construct/start

**Choice:** Synchronous try/catch around `new MediaRecorder` and `recorder.start`; on failure set error state, clear times/segments, and leave no active recorder ref. Event-path errors use the recorder's `error` event (preferring `event.error` when it is an `Error`).

**Rationale:** Construction/start failures must not throw into React event handlers; tests assert they surface as `isError` instead.

## Risks / Trade-offs

- **[Risk] Unmount cleanup is implemented but not directly asserted in unit tests** → Mitigation: verification task to confirm behavior or add a focused test in a future delta
- **[Risk] `startTime` / `endTime` are part of the public state but lightly exercised in tests (finalized inferred via `endTime`)** → Mitigation: treat timing fields as documented API; optional assertion follow-up
- **[Risk] Custom `dataAvailableHandler` can still schedule work after unmount if it ignores the gated callback** → Mitigation: session gate on the provided `callback`; document that handlers must use that callback for state updates
- **[Risk] Hook does not stop tracks or close the stream** → Mitigation: by design; media-capture owns stream lifecycle
- **[Trade-off] Casting to `RecorderState` skips runtime discriminant validation** → Accepted for performance; TypeScript shapes document the contract

## Migration Plan

Not applicable—documentation-only baseline. Optional follow-up: sync delta into `openspec/specs/media-recorder/` via archive/sync workflow.

## Open Questions

- None for baseline accuracy. Optional product questions (mime-type helpers, automatic blob assembly into a single File) are out of scope until a future change.
