## Context

This change baselines existing `VideoPlayer` and `AudioPlayer` components in `packages/react-user-media`. Both are thin `forwardRef` wrappers around native `<video>` / `<audio>` that bind a required `media: MediaProvider` to `srcObject`. Behavior is already covered by `VideoPlayer.spec.tsx` and `AudioPlayer.spec.tsx` (Vitest + Playwright browser mode). No runtime changes are planned.

Public surface is re-exported from `packages/react-user-media/src/components/index.tsx` (`VideoPlayer`, `VideoPlayerProps`, `AudioPlayer`, `AudioPlayerProps`).

## Goals / Non-Goals

**Goals:**

- Record as-built architecture for attaching, updating, and clearing `srcObject`
- Align design decisions with tested lifecycle (unmount, element replace, media prop change)
- Give future deltas a stable reference for player prop contracts and ref behavior

**Non-Goals:**

- Changing component APIs or implementation
- Building custom controls, chrome, or playback state machines
- Owning stream lifecycle (callers / `useMedia` remain responsible for obtain/release)
- Expanding to non-`MediaProvider` sources (URL `src` remains intentionally unsupported)

## Decisions

### 1. `srcObject` only — omit `src` / `srcObject` from props

**Choice:** `VideoPlayerProps` / `AudioPlayerProps` extend native element props via `Omit<..., "src" | "srcObject">` and require `media: MediaProvider`.

**Rationale:** Stream playback is the library's domain; allowing `src` would dual-path the element and fight `srcObject` assignment. `MediaProvider` covers `MediaStream` and related providers.

**Alternatives considered:** Accept `src` string for file/URL playback — rejected for this baseline; out of library focus.

### 2. Callback ref owns attach / detach

**Choice:** A `useCallback` ref (`setRef`) forwards to the consumer ref, tracks the current element in an internal ref, sets `element.srcObject = media` on attach, and sets `srcObject = null` when the element becomes `null` or is replaced.

**Rationale:** Attach/clear happens at the DOM host boundary (including unmount), without a separate `useEffect` for cleanup. Replacing the host element clears the previous node before binding the new one.

**Alternatives considered:** `useEffect` + `useImperativeHandle` only — would miss some replace timing; current pattern matches existing tests that invoke the host ref callback directly.

### 3. `media` in the ref callback dependency list

**Choice:** `setRef` depends on `[ref, media]`, so a `media` prop change produces a new callback and React re-invokes it, updating `srcObject` on the same element.

**Rationale:** Keeps assignment logic in one place (the ref callback) rather than splitting mount vs update paths.

**Alternatives considered:** Explicit `useEffect` on `media` — equivalent outcome; not how the shipped code works.

### 4. Symmetric video and audio implementations

**Choice:** `VideoPlayer` and `AudioPlayer` share the same control flow; only the element type (`video` vs `audio`) and attribute types differ.

**Rationale:** Identical lifecycle requirements; duplication is small and keeps types precise (`HTMLVideoElement` vs `HTMLAudioElement`).

**Alternatives considered:** Shared factory/HOC — not present on main; baseline documents current duplication.

### 5. No ownership of stream stop/close

**Choice:** Clearing `srcObject` detaches the element from the provider; it does not call `track.stop()` or `closeMedia`.

**Rationale:** Players are presentation adapters. Capture lifecycle belongs to `useMedia` / callers.

## Risks / Trade-offs

- **[Risk] Ref-callback dependency on React re-invoking when `media` changes** → Mitigation: covered by "updates srcObject when the media prop changes" tests; future React ref semantics changes would need re-validation.
- **[Risk] Element-replace tests reach into React fiber via `getHostRefCallback`** → Mitigation: test-only helper; production API is ordinary `forwardRef`. Document as test harness detail, not public contract.
- **[Trade-off] No `src` URL support** → Consumers needing file URLs use a plain `<video>` / `<audio>` or fork; library stays stream-focused.
- **[Trade-off] Duplicate video/audio modules** → Slight maintenance cost vs shared abstraction; acceptable at current size.

## Migration Plan

Not applicable — documentation-only baseline. No deploy, rollback, or consumer migration.

Optional follow-up: archive/sync delta into `openspec/specs/media-players/` after review.

## Open Questions

- None for baseline accuracy. Future deltas may ask whether to factor a shared internal player helper or add optional URL `src` support; both are out of scope here.
