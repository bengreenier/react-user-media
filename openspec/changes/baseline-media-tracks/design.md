## Context

As-built documentation of observational track hooks in `@bengreenier/react-user-media`. Implementation lives in `packages/react-user-media/src/hooks/use-media-ext.ts` and is re-exported from `hooks/index.ts`. Coverage is in `use-media-ext.spec.tsx` and `use-track-mute-state.spec.tsx` (Vitest + Playwright browser mode for real `getUserMedia` tracks; mute-state tests use a lightweight `EventTarget` stub).

These hooks complement capture/device hooks: they consume an already-owned `MediaStream` / `MediaStreamTrack` and expose reactive membership and mute state. They do not request permissions or manage stream teardown.

## Goals / Non-Goals

**Goals:**

- Record the existing observation model: `useSyncExternalStore` + DOM events + cached snapshots
- Describe kind filtering (`audio` / `video`) and mute-state mapping
- Clarify that track-list identity is keyed by track `id` sets, not array identity from `getTracks()`
- Anchor verification to the existing unit/browser tests

**Non-Goals:**

- Changing hook APIs, caching strategy, or event subscriptions
- Adding enable/disable, ended, or settings observation
- Owning stream lifecycle or integrating with `useMedia` / recorder / players beyond accepting their streams as inputs
- Syncing this delta into `openspec/specs/` in this change

## Decisions

### 1. External store over React state for track lists and mute

- **Choice:** `useSyncExternalStore` with subscribe/getSnapshot callbacks closed over `media` / `track`.
- **Rationale:** Browser media objects are external mutable sources; React docs recommend this for store-like subscriptions and stable `getSnapshot` results.
- **Alternatives:** `useState` + `useEffect` listeners (more tear/re-render edge cases); polling `getTracks()` (wasteful, less precise).

### 2. Event-driven invalidation, snapshot from live media

- **Choice:** Subscribe to `addtrack`/`removetrack` (stream) or `mute`/`unmute` (track). On notification, `getSnapshot` re-reads `media.getTracks()` (optionally filtered by kind) or `track.muted`.
- **Rationale:** Matches Web platform events; keeps React in sync when membership or mute changes.
- **Note (as-tested):** Specs/tests call `addTrack`/`removeTrack` and also dispatch the matching events where the environment may not emit them, so requirements are framed around the subscription + snapshot contract rather than guaranteeing native event emission from every mutation path.

### 3. Snapshot cache keyed by track id set

- **Choice:** Module-level frozen `EMPTY_TRACKS`; per-hook `useRef` cache; update only when `hasSameTrackIds` detects a different set of ids (order-insensitive set equality). Empty results reuse `EMPTY_TRACKS`.
- **Rationale:** `getTracks()` always returns a new array; caching satisfies `useSyncExternalStore`'s stable-snapshot requirement and preserves references for kind-filtered hooks when unrelated kinds change.
- **Alternatives:** Always return a fresh array (breaks referential equality consumers); deep-compare track objects (unnecessary for id-keyed membership).

### 4. Kind filters as thin wrappers

- **Choice:** Private `useMediaTracksByKind(media, kind)` shared by `useMediaAudioTracks` / `useMediaVideoTracks`; `useMediaTracks` is a parallel implementation without a filter.
- **Rationale:** Same subscription and cache rules; filter in `getSnapshot` so audio/video consumers do not re-render when only the other kind's ids change.

### 5. Mute as a two-value string union

- **Choice:** `TrackMuteState = "muted" | "unmuted"` derived from boolean `track.muted`.
- **Rationale:** Explicit UI-friendly labels; required `MediaStreamTrack` argument (no `undefined` overload), unlike stream hooks which accept `undefined` for optional media.

### 6. No lifecycle ownership

- **Choice:** Hooks never `stop()` tracks or close streams; unsubscribe only removes event listeners.
- **Rationale:** Observation is composable with any stream source (`useMedia`, peer connections, tests). Lifecycle remains the caller's responsibility.

## Risks / Trade-offs

- **[Risk] Membership changes without `addtrack`/`removetrack` leave React stale** → Mitigation: document event-driven contract; tests dispatch events; callers using non-emitting mutation paths must ensure events fire or remount with a new stream reference.
- **[Risk] Shared frozen empty array is mutated by a hostile caller** → Mitigation: `Object.freeze`; tests assert `TypeError` on push and isolation across hook instances.
- **[Trade-off] Id-set equality ignores track property changes** (e.g. `enabled`, `readyState`) → Acceptable for membership hooks; mute has its own hook; other properties are out of scope.
- **[Trade-off] Duplicate implementation between all-tracks and by-kind paths** → Slight duplication vs shared helper taking optional kind; kept as-built for clarity and independent caches.

## Migration Plan

Not applicable — baseline documentation only; no runtime migration.

## Open Questions

- None for baseline accuracy. Optional follow-up: archive/sync into `openspec/specs/media-tracks/` when the project adopts main specs.
