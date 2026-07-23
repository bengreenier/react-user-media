## Why

The library already ships `useMedia`, `closeMedia`, and `getSupportedConstraints` for browser media capture, but there is no OpenSpec baseline for that behavior. Documenting it as-built gives future deltas a stable contract for lifecycle, cleanup, and API surface without changing runtime behavior.

## What Changes

- Add an OpenSpec capability `media-capture` that records existing requirements for:
  - `useMedia("user" | "display")` → `getUserMedia` / `getDisplayMedia`
  - Discriminated idle → loading → ready | error state, plus `request` / `stop`
  - Request generations, stream close on re-request / type change / unmount
  - `closeMedia` and `getSupportedConstraints`
- No application code, API, or test behavior changes.

## Non-goals

- Implementing or refactoring hooks, helpers, or examples
- Changing public API signatures or state shape
- Adding workers, WebCodecs, or MediaRecorder coverage
- Expanding browser support beyond what already exists
- Syncing into `openspec/specs/` as part of this change (optional follow-up)

## Capabilities

### New Capabilities

- `media-capture`: React hook and helpers for obtaining, managing, and releasing user/display `MediaStream`s, including lifecycle correctness and constraint discovery.

### Modified Capabilities

- (none)

## Impact

- Planning only: artifacts under `openspec/changes/baseline-media-capture/`
- Documents existing code in `packages/react-user-media` (`use-media.ts`, `close-media.ts`, `index.ts`) and tests (`use-media.spec.tsx`, `close-media.spec.ts`)
- No package publish or dependency impact
