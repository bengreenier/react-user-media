## Why

The library already ships observational hooks for `MediaStream` track membership and per-track mute state, but there is no OpenSpec baseline for that behavior. Documenting it as-built gives future deltas a stable contract for subscription, snapshot stability, and kind filtering without changing runtime behavior.

## What Changes

- Add an OpenSpec capability `media-tracks` that records existing requirements for:
  - `useMediaTracks`, `useMediaAudioTracks`, `useMediaVideoTracks`
  - `useTrackMuteState` and `TrackMuteState`
  - Observational `useSyncExternalStore` subscriptions (`addtrack`/`removetrack`, `mute`/`unmute`)
  - Snapshot caching / frozen empty arrays; no stream lifecycle ownership
- No application code, API, or test behavior changes.

## Non-goals

- Implementing or refactoring hooks, helpers, or examples
- Changing public API signatures or return types
- Owning or stopping `MediaStream` / track lifecycle (capture, recorder, players)
- Adding track enable/disable controls beyond mute observation
- Syncing into `openspec/specs/` as part of this change (optional follow-up)

## Capabilities

### New Capabilities

- `media-tracks`: React hooks that observe a `MediaStream`'s tracks (optionally by kind) and a track's mute state via external-store subscriptions, without owning media lifecycle.

### Modified Capabilities

- (none)

## Impact

- Planning only: artifacts under `openspec/changes/baseline-media-tracks/`
- Documents existing code in `packages/react-user-media` (`hooks/use-media-ext.ts`, re-exported from `hooks/index.ts`) and tests (`use-media-ext.spec.tsx`, `use-track-mute-state.spec.tsx`)
- No package publish or dependency impact
