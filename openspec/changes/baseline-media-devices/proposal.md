## Why

The library already ships `useMediaDevices` and kind-filtered extensions for `enumerateDevices`, but there is no OpenSpec baseline for that behavior. Documenting it as-built gives future deltas a stable contract for request lifecycle, filtering, and `devicechange` handling without changing runtime behavior.

## What Changes

- Add an OpenSpec capability `media-devices` that records existing requirements for:
  - `useMediaDevices` with idle → loading → ready | error state, `devices`, and `request()`
  - Options `filter` and `deviceChangedEvent` (default `true`); no auto-request on mount
  - Kind-filtered extensions: `useMediaAudioDevices`, `useMediaAudioInputDevices`, `useMediaAudioOutputDevices`, `useMediaVideoDevices`
  - Request generations, filter exceptions, and unmount invalidation
- No application code, API, or test behavior changes.

## Non-goals

- Implementing or refactoring hooks, extensions, or examples
- Changing public API signatures or state shape
- Covering `useMedia`, MediaRecorder, players, or track helpers
- Expanding browser support beyond what already exists
- Syncing into `openspec/specs/` as part of this change (optional follow-up)

## Capabilities

### New Capabilities

- `media-devices`: React hooks for enumerating media devices via `navigator.mediaDevices.enumerateDevices`, including optional filtering, `devicechange` re-request, and kind-scoped convenience hooks.

### Modified Capabilities

- (none)

## Impact

- Planning only: artifacts under `openspec/changes/baseline-media-devices/`
- Documents existing code in `packages/react-user-media` (`use-media-devices.ts`, `use-media-devices-ext.ts`, package exports) and tests (`use-media-devices.spec.tsx`)
- No package publish or dependency impact
