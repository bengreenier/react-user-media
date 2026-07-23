## Context

`@bengreenier/react-user-media` already implements device enumeration as React hooks over `navigator.mediaDevices.enumerateDevices`. This design records the as-built architecture for the `media-devices` capability so future OpenSpec deltas can change behavior against a known baseline. No runtime changes are introduced by this change.

Primary sources:

- `packages/react-user-media/src/hooks/use-media-devices.ts` — `useMediaDevices`, `MediaDeviceState`, `UseMediaDeviceOptions`
- `packages/react-user-media/src/hooks/use-media-devices-ext.ts` — kind-filtered wrappers
- `packages/react-user-media/src/hooks/use-media-devices.spec.tsx` — behavioral contract
- Public re-exports via `packages/react-user-media/src/hooks/index.ts` and package entry

## Goals / Non-Goals

**Goals:**

- Document the request-driven state machine (idle / loading / ready / error)
- Capture filtering, `devicechange` subscription, and stale-request invalidation as designed
- Describe how extension hooks compose filters without owning separate enumeration logic

**Non-Goals:**

- Changing hook APIs, defaults, or implementation
- Specifying capture (`useMedia`), tracks, players, or MediaRecorder
- Adding permission prompts, device selection UI, or label-enrichment strategies beyond what the browser returns from `enumerateDevices`

## Decisions

### 1. Explicit `request()`; no mount-time enumeration

**Choice:** Start idle; enumeration only when `request()` runs (or when `devicechange` fires and monitoring is enabled).

**Rationale:** Enumeration can be gated by secure context and permission state; auto-calling on mount would surprise callers and complicate SSR / unavailable `mediaDevices` cases. Tests assert idle-on-mount and no throw when `mediaDevices` is missing until `request()`.

**Alternatives considered:** Auto-enumerate on mount (rejected for control and testability).

### 2. Discriminated-style flags with shared shape

**Choice:** Expose `isLoading` / `isError` / `isReady`, `error`, `devices`, and `request` as a TypeScript union (`MediaDeviceState`) while returning a single object cast from a shallow shape.

**Rationale:** Matches library convention for other media hooks; consumers can narrow on flags. Runtime avoids exhaustive branch checks for cost.

**Alternatives considered:** Separate return tuples or status enum string (not used elsewhere in this package).

### 3. Filter applied at settle time via ref

**Choice:** Store `filter` in a ref updated each render; apply `devices.filter(filterRef.current)` when the promise succeeds. Default filter is `() => true`.

**Rationale:** `request` is stable (`useCallback` with `[]`); using a ref keeps the latest filter without recreating `request` or ignoring mid-flight option changes. Filter throws are caught and surfaced as error state so loading cannot stick.

**Alternatives considered:** Close over filter in `request` (would freeze filter at call time; tests require latest filter).

### 4. `deviceChangedEvent` defaults to true

**Choice:** Subscribe to `devicechange` when enabled and call `request()`; tear down the listener on option change / unmount. Default `true`.

**Rationale:** Device lists go stale when hardware is plugged/unplugged; opt-out exists for tests and callers who manage refresh themselves.

**Alternatives considered:** Default false (would require every consumer to opt in for live updates).

### 5. Request generation counter for concurrency and unmount

**Choice:** Increment a generation on each `request()` and on unmount teardown; ignore success/error callbacks whose generation no longer matches.

**Rationale:** Overlapping enumerate calls and post-unmount resolutions must not clobber newer UI state or update unmounted trees.

**Alternatives considered:** AbortController (not available on `enumerateDevices` itself); ignore only on unmount (insufficient for overlapping requests).

### 6. Kind filters as thin wrappers

**Choice:** Extension hooks call `useMediaDevices` with a composed filter: kind predicate AND optional caller `filter`.

**Rationale:** Single enumeration implementation; kind helpers stay small and share lifecycle / options behavior. Audio/video use `kind.startsWith(...)`; input/output use exact `kind` equality.

**Alternatives considered:** Separate hooks with duplicated enumerate logic (rejected).

## Risks / Trade-offs

- **[Risk] Labels empty without prior permission** → Mitigation: documented browser behavior; out of scope for this baseline to fabricate labels.
- **[Risk] `devicechange` only in secure contexts** → Mitigation: listener gated on `addEventListener`; missing API simply skips monitoring.
- **[Risk] Filter side effects on every settle** → Mitigation: filter is expected to be pure; throws become error state.
- **[Trade-off] State returned via cast, not runtime narrowing** → Callers rely on TypeScript; incorrect flag combinations are not runtime-validated.

## Migration Plan

Not applicable — documentation-only baseline. Optional later step: archive/sync into `openspec/specs/media-devices/` after review.

## Open Questions

- None for as-built documentation. Future deltas may decide whether to auto-request, expose permission-aware label refresh, or unify state helpers across hooks.
