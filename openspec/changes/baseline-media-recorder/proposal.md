## Why

The library already ships `useMediaRecorder` for wrapping the browser `MediaRecorder` API with React-friendly state and lifecycle controls, but there is no OpenSpec baseline for that behavior. Documenting it as-built gives future deltas a stable contract for recording sessions, pause/resume, segments, and error handling without changing runtime behavior.

## What Changes

- Add an OpenSpec capability `media-recorder` that records existing requirements for:
  - `useMediaRecorder()` state machine: idle → recording ↔ paused → finalized | error
  - Actions: `startRecording`, `stopRecording`, `pauseRecording`, `resumeRecording`
  - Options: `MediaRecorderOptions` plus `timeslice` and `dataAvailableHandler`
  - Session invalidation on restart/unmount; segment accumulation as `Blob[]`
- No application code, API, or test behavior changes.

## Non-goals

- Implementing or refactoring the hook or examples
- Changing public API signatures or discriminated state shape
- Exposing internal helpers (`useMediaRecorderState`, `useMediaRecorderError`) as public API
- Adding workers, WebCodecs, or mime-type negotiation beyond current options passthrough
- Syncing into `openspec/specs/` as part of this change (optional follow-up)

## Capabilities

### New Capabilities

- `media-recorder`: React hook for recording a `MediaStream` via `MediaRecorder`, including pause/resume, segment blobs, session cleanup, and error surfacing.

### Modified Capabilities

- (none)

## Impact

- Planning only: artifacts under `openspec/changes/baseline-media-recorder/`
- Documents existing code in `packages/react-user-media` (`use-media-recorder.ts`, public exports) and tests (`use-media-recorder.spec.tsx`)
- No package publish or dependency impact
