## ADDED Requirements

### Requirement: Idle initial state
`useMediaRecorder` SHALL start in an idle state where `isError`, `isRecording`, `isPaused`, and `isFinalized` are all `false`, `error` is `null`, `startTime` and `endTime` are `null`, and `segments` is an empty array.

#### Scenario: Starts from idle state
- **WHEN** a component mounts and calls `useMediaRecorder()` without starting
- **THEN** `isError` is `false`, `isRecording` is `false`, `isFinalized` is `false`, and `segments.length` is `0`

### Requirement: Start recording
`useMediaRecorder` SHALL expose `startRecording(media, options?)` which creates a `MediaRecorder` for the given `MediaStream`, clears prior segments and end time, records a `startTime`, and transitions to recording (`isRecording` true) when `MediaRecorder.start` succeeds. Optional `RecorderOptions` SHALL extend `MediaRecorderOptions` with `timeslice` and `dataAvailableHandler`. When `timeslice` is omitted, `MediaRecorder.start()` MUST be called with no timeslice argument (browser default). When `timeslice` is provided, `MediaRecorder.start(timeslice)` MUST be used.

#### Scenario: Browser default timeslice
- **WHEN** the consumer calls `startRecording(media)` without `timeslice`
- **THEN** the underlying `MediaRecorder.start` is invoked with no arguments

#### Scenario: Explicit timeslice
- **WHEN** the consumer calls `startRecording(media, { timeslice: 250 })`
- **THEN** the underlying `MediaRecorder.start` is invoked with `250`

### Requirement: Pause and resume recording
While recording, `pauseRecording` SHALL pause the active `MediaRecorder` when its state is `"recording"`, setting `isPaused` true and `isRecording` false. `resumeRecording` SHALL resume when state is `"paused"`, restoring `isRecording` true and `isPaused` false. Neither action SHALL finalize the session.

#### Scenario: Pause and resume toggle
- **WHEN** recording is active and the consumer calls `pauseRecording`
- **THEN** `isPaused` is `true`, `isRecording` is `false`, and `isFinalized` is `false`
- **WHEN** the consumer then calls `resumeRecording`
- **THEN** `isPaused` is `false` and `isRecording` is `true`

### Requirement: Stop and finalize
`stopRecording` SHALL stop the active `MediaRecorder` when it is not already `"inactive"`. After the recorder's `stop` event for the current session, the hook SHALL set `endTime` and enter the finalized state (`isFinalized` true) with `isRecording` and `isPaused` false. Finalization MUST succeed even when no data segments were produced.

#### Scenario: Finalize with no segments
- **WHEN** the consumer starts recording and then stops without any `dataavailable` payloads
- **THEN** `isFinalized` becomes `true` and `segments.length` remains `0`

#### Scenario: Record real user media (integration)
- **WHEN** the consumer records a live user-media stream via `startRecording` / `stopRecording` with a custom `dataAvailableHandler`
- **THEN** after stop, `isFinalized` is true and `segments.length` is greater than `0`

### Requirement: Segment accumulation
By default, each `dataavailable` event for the current session SHALL append `ev.data` to `segments`. A custom `dataAvailableHandler(ev, callback)` MAY replace that behavior; the hook MUST supply a session-gated `callback` that updates `segments` only while the session remains current.

#### Scenario: Default concatenation (implied by restart cleanup)
- **WHEN** a `dataavailable` event fires for the current session with the default handler
- **THEN** the event's `Blob` is included in `segments` for that session

### Requirement: Session invalidation on restart
Calling `startRecording` while a prior session exists SHALL invalidate the previous session: stop the prior recorder if active, remove its `dataavailable` listener, bump the session id, and reset segments. Stale `dataavailable` events and deferred custom-handler callbacks from the previous session MUST NOT mutate `segments`. Late `error` events from the previous recorder MUST NOT set `isError` on the new session.

#### Scenario: Cleans up previous recorder when restarted
- **WHEN** the consumer starts recording, then starts again
- **THEN** the first `MediaRecorder` is stopped once
- **WHEN** the first recorder later dispatches `dataavailable` and the second also dispatches data
- **THEN** only the current session's data is reflected in `segments` (length `1` for a single new blob)

#### Scenario: Ignores deferred callbacks from previous sessions
- **WHEN** a custom `dataAvailableHandler` defers its `callback` and the consumer restarts recording before the deferred callback runs
- **THEN** invoking the deferred callback does not change `segments` (remains `0` after restart reset)

#### Scenario: Ignores late errors from previous sessions
- **WHEN** the consumer restarts recording and the previous recorder dispatches an `error` in the same turn
- **THEN** `isError` remains `false` for the new session

### Requirement: Error surfacing
Constructor failures from `new MediaRecorder`, synchronous failures from `MediaRecorder.start`, and `error` events on the active recorder SHALL set `isError` true, expose `error` with the underlying message when available, and keep `isRecording` false. Native error details (e.g. `DOMException`) MUST be preserved when present on the event. Failed starts MUST NOT leave a recording session active.

#### Scenario: Constructor failure
- **WHEN** `MediaRecorder` construction throws (e.g. unsupported mimeType)
- **THEN** `isError` is `true`, `error.message` matches the thrown error, `isRecording` is `false`, and no recorder instance remains active

#### Scenario: start failure
- **WHEN** `MediaRecorder.start` throws
- **THEN** `isError` is `true`, `error.message` matches the thrown error, and `isRecording` is `false`

#### Scenario: Native MediaRecorder error event
- **WHEN** the active recorder dispatches an `error` event carrying a `DOMException`
- **THEN** `isError` is `true` and `error.message` matches the native error message

#### Scenario: Clears errors when a new recording starts
- **WHEN** the hook is in an error state from a prior recorder `error` event and the consumer successfully calls `startRecording` again
- **THEN** `isError` becomes `false`

### Requirement: Unmount cleanup
On unmount, `useMediaRecorder` SHALL invalidate the current session and stop any non-inactive `MediaRecorder`, preventing further segment updates from that session.

#### Scenario: Cleanup on unmount
- **WHEN** the component using `useMediaRecorder` unmounts during an active recording
- **THEN** the active recorder is stopped (if not already inactive) and the session is invalidated
