## Context

`@bengreenier/react-user-media` already implements media capture in `packages/react-user-media`:

- `useMedia` (`src/hooks/use-media.ts`) — React hook over `getUserMedia` / `getDisplayMedia`
- `closeMedia` (`src/close-media.ts`) — stop all tracks on a stream
- `getSupportedConstraints` (`src/index.ts`) — thin, null-safe wrapper around `mediaDevices.getSupportedConstraints`

This design records the **as-built** architecture so future OpenSpec deltas can reason about lifecycle and API contracts. No new implementation is proposed.

Covered tests live in `use-media.spec.tsx` and `close-media.spec.ts` (Vitest + Testing Library, browser-oriented mocks).

## Goals / Non-Goals

**Goals:**

- Document how media acquisition, discriminated state, request generations, and cleanup work today
- Make the public surface and lifecycle guarantees explicit for baselining
- Align design language with existing tests and TypeScript types

**Non-Goals:**

- Redesigning the hook API or state machine
- Adding workers, WebCodecs, device enumeration, or MediaRecorder into this capability
- Changing cleanup semantics or introducing new dependencies
- Migrating runtime behavior; this change is documentation-only

## Decisions

### 1. Single hook with a type discriminant

**Choice:** One `useMedia(type)` entry point where `type` is `"user" | "display"`, rather than separate hooks.

**Rationale (as-built):** Shared loading/error/ready machinery and identical cleanup rules; TypeScript conditional types (`inferMediaDef`) specialize `request` argument and return state per type.

**Alternatives considered:** Separate `useUserMedia` / `useDisplayMedia` hooks — not used; would duplicate generation and teardown logic.

### 2. Discriminated boolean flags + cast return

**Choice:** Internal state is three React state fields (`media`, `error`, `isLoading`) plus derived `isReady` / `isError`. The return value is typed as a discriminated union but assembled as one object and cast (`as inferMediaDef<TType>["stateType"]`).

**Rationale:** Avoids runtime branching cost while preserving a strong consumer-facing type. Flags remain mutually exclusive by construction of setters.

**Alternatives considered:** Explicit tagged union in runtime state (`status: "idle" | ...`) — not used in current code.

### 3. Request generations for async correctness

**Choice:** A mutable `requestGeneration` ref increments on every `request`, `stop`, `type` change, and unmount. Success/error/finalize handlers ignore mismatched generations; successful-but-stale streams are passed to `closeMedia`.

**Rationale:** Media promises outlive React renders; without generations, late resolutions would leak tracks or overwrite newer media (covered by stale / unmount / type-change tests).

**Alternatives considered:** AbortController on constraints APIs — not universally available / not used here; generation counter is sufficient for ignore-and-close.

### 4. Eager close of prior stream on re-request

**Choice:** At the start of `request`, call `closeMedia(mediaRef.current)` and clear ref/state media before invoking the browser API.

**Rationale:** Prevents overlapping live tracks when the consumer re-requests; matches “stops the previous user media stream when re-requesting” test.

### 5. Type change resets like stop (without requiring consumer action)

**Choice:** An effect compares `type` to `typeRef`; on change, bump generation, close held media, and clear to idle.

**Rationale:** Switching `"user"` ↔ `"display"` must not keep the wrong stream or apply a late user promise to a display hook instance.

### 6. Unmount teardown closes tracks only

**Choice:** Cleanup effect bumps generation and `closeMedia`s the ref; it does not set React state (component is gone).

**Rationale:** Avoids setState-after-unmount while still ending tracks and invalidating in-flight handlers.

### 7. Capability checks before promise

**Choice:** If the matching capture API is missing, set a descriptive `Error` and skip `setIsLoading(true)` / promise path.

**Rationale:** Fail closed in non-secure or incomplete environments without throwing from `request`.

### 8. Shared `closeMedia` helper

**Choice:** Centralize `media?.getTracks().forEach(track => track.stop())`.

**Rationale:** One place for teardown used by the hook; undefined-safe for idle paths.

### 9. Null-safe `getSupportedConstraints`

**Choice:** Optional chaining through `globalThis.navigator?.mediaDevices?.getSupportedConstraints?.()` with `?? {}`.

**Rationale:** Safe to call during SSR or degraded environments; returns empty constraint map rather than throwing.

## Risks / Trade-offs

- **[Risk] Cast return can drift from true discriminant invariants** → Mitigation: keep tests asserting exclusive idle/loading/ready/error presentations; prefer not widening setters.
- **[Risk] Generation counter is process-local and silent** → Mitigation: always `closeMedia` on stale success so leaks are prevented even when state updates are skipped.
- **[Risk] No AbortSignal** → Mitigation: superseded requests may still complete in the browser; library closes unused streams on resolve. Consumers should still prefer `stop` / unmount for intentional teardown.
- **[Risk] Baseline docs can drift from code** → Mitigation: verification tasks audit scenarios against `use-media.spec.tsx` / `close-media.spec.ts` before treating archive as source of truth.
- **[Trade-off] Single object + cast vs runtime tagged state** → Favor typing ergonomics and less boilerplate; correctness relies on disciplined updates and tests.

## Migration Plan

Not applicable for runtime. After archive/sync, main specs under `openspec/specs/media-capture/` SHOULD mirror this baseline so later changes use MODIFIED/ADDED deltas. No rollback beyond deleting or revising these planning artifacts.

## Open Questions

- Whether to promote this capability into `openspec/specs/` immediately after validation (optional; listed as a verification task, not required for apply-ready planning).
- Whether future deltas should add an explicit runtime `status` discriminant (out of scope for this baseline).
