## Why

The library already ships `VideoPlayer` and `AudioPlayer` for binding a `MediaProvider` to `<video>` / `<audio>`, but there is no OpenSpec baseline for that behavior. Documenting it as-built gives future deltas a stable contract for ref forwarding, `srcObject` lifecycle, and prop surface without changing runtime behavior.

## What Changes

- Add an OpenSpec capability `media-players` that records existing requirements for:
  - `VideoPlayer` / `AudioPlayer` as `forwardRef` wrappers around native media elements
  - Required `media: MediaProvider`; sets `srcObject`; omits consumer `src` / `srcObject`
  - Clears `srcObject` on unmount, element replace, and `media` prop change
  - Forwards remaining HTML media attributes to the underlying element
- No application code, API, or test behavior changes.

## Non-goals

- Implementing or refactoring player components or test utilities
- Changing public API signatures or prop types
- Adding controls UI, play/pause orchestration, or custom media chrome
- Covering `useMedia`, devices, or MediaRecorder (separate baselines)
- Syncing into `openspec/specs/` as part of this change (optional follow-up)

## Capabilities

### New Capabilities

- `media-players`: React components that bind a `MediaProvider` to native `<video>` and `<audio>` elements with correct `srcObject` lifecycle and attribute forwarding.

### Modified Capabilities

- (none)

## Impact

- Planning only: artifacts under `openspec/changes/baseline-media-players/`
- Documents existing code in `packages/react-user-media` (`VideoPlayer.tsx`, `AudioPlayer.tsx`, `components/index.tsx`) and tests (`VideoPlayer.spec.tsx`, `AudioPlayer.spec.tsx`)
- No package publish or dependency impact
