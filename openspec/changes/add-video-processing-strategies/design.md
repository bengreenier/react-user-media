## Context

`@bengreenier/react-user-media` acquires streams (`useMedia`), plays video (`VideoPlayer`), records (`useMediaRecorder`), and ships a three-strategy **audio** processing family. Audio’s design deferred video/WebCodecs and named `MediaStreamTrackProcessor` as the realtime analogue of AudioWorklet, with Comlink Dedicated Worker as the async/WebCodecs home.

This change delivers the full **video** triad with the same consumer choice model—not a single strategy and not PR #6’s custom message protocol.

Constraints: React 19 peer, tsup CJS+ESM, Vitest browser tests, secure context, ESM-first module URLs, existing `comlink` dependency.

## Goals / Non-Goals

**Goals:**

- Shared contracts: video frame/result/options types, discriminated idle/loading/ready/error, session invalidation, no default track-stop
- Strategy A — **Track processor realtime**: `MediaStreamTrackProcessor` (+ transform / optional generator)
- Strategy B — **Dedicated Worker + Comlink**: async `VideoFrame` / WebCodecs jobs via `expose`/`wrap`/`transfer`/`proxy`
- Strategy C — **Track processor + Comlink RPC**: realtime frame path + Comlink configure/subscribe control plane
- Clear selection guidance; phased ship order; tree-shake-friendly subpath exports
- Parallel naming/lifecycle to audio so the processing family feels one product

**Non-Goals:**

- One strategy pretending to cover all workloads
- Replacing MediaRecorder or capture ownership
- CJS-default worker/processor factories without overrides
- Heavy CV/codec suite beyond v1 proving workloads
- Changing audio APIs

## Selection guide

```
  Need                                      Use
  ─────────────────────────────────────────────────────────────
  Live track meters / FX / frame taps       video-track-processor
  Offline / heavy / WebCodecs buffer jobs   video-worker (Comlink)
  Live path + typed configure/subscribe     video-track-rpc
  (audio equivalents remain audio-*)
```

## Decisions

### One family, three capabilities

**Choice:** Three OpenSpec capabilities (`video-track-processor`, `video-worker`, `video-track-rpc`) sharing types and lifecycle rules. React surface:

- `useMediaVideoProcessor(media, { strategy: "track" | "track-rpc", ... })` for stream-oriented paths
- `useVideoWorker(options?)` for buffer/job-oriented path (`strategy: "worker"` implicit)
- Optional unified overload later; not required for v1

**Rationale:** Matches audio DX (`useMediaAudioProcessor` + `useAudioWorker`); keeps specs separable for phased delivery.

**Alternatives considered:** Worker-only (too narrow vs user ask); single mega-hook with no strategy split (hides tradeoffs); reviving PR #6 `useMediaWorker` (wrong protocol and scope).

### Shared types and ownership

**Choice:** Public video-namespaced types (`VideoProcessOptions`, `VideoProcessResult`, job/frame wrappers). Media-capture owns `MediaStream` lifecycle. Processors MUST NOT call capture APIs and MUST NOT stop tracks on unmount by default. Hooks use boolean discriminants + generation/session ids.

**Rationale:** Same conventions as audio and `useMedia` / `useMediaRecorder`.

### Strategy A — MediaStreamTrackProcessor realtime

**Choice:**

```
  MediaStream video track
    → MediaStreamTrackProcessor
    → TransformStream (sync-friendly transform; close frames you don’t output)
    → optional MediaStreamTrackGenerator / muted sink / metrics-only path
```

v1 built-in: frame summary metrics (dimensions/timestamp) and/or a cheap passthrough suitable for UI. Metrics to main at a throttled rate (e.g. ≤60 Hz), not necessarily every frame. Hook handles processor wiring, teardown, and `VideoFrame.close` discipline.

**Rationale:** Correct primitive for live video tracks; mirrors AudioWorklet’s role without abusing audio APIs.

**Alternatives considered:** `requestVideoFrameCallback` on a `<video>` element only — simpler but not an extensible insertable-stream strategy; Dedicated Worker as primary for live — wrong backpressure/clock model for continuous track IO.

### Strategy B — Dedicated Worker + Comlink

**Choice:** Depend on existing `comlink`. Worker `Comlink.expose`s:

```ts
interface VideoWorkerApi {
  configure(options: VideoProcessOptions): Promise<void>;
  processFrame(frame: VideoJobFrame): Promise<VideoProcessResult>;
  subscribe(onResult: (r: VideoProcessResult) => void): Promise<void>;
  dispose(): Promise<void>;
}
```

Hot path uses `Comlink.transfer` for `VideoFrame`. Worker MUST `close()` owned frames after each job and on `dispose`. v1 jobs: summary mode + optional WebCodecs `VideoEncoder` encode when `isConfigSupported`. Main `Comlink.wrap`; teardown `releaseProxy` + `terminate`. Optional thin bridge may pull frames from a stream for convenience; docs steer continuous realtime to track-processor.

**Rationale:** Same DX as `audio-worker`; natural WebCodecs home.

**Alternatives considered:** Hand-rolled PR #6 messages — rejected; merging into audio worker API — rejected (namespacing).

### Strategy C — Track processor + Comlink RPC

**Choice:** Same realtime track/transform path as strategy A. Main thread `Comlink.wrap` on a control `MessagePort` (dedicated port or documented endpoint paired with the processor session); processor side `Comlink.expose` for `configure` / `subscribe` / `dispose`. **No awaits of Comlink inside the per-frame transform hot path** — configure mutates fields; results are queued/coalesced without blocking frame throughput.

**Rationale:** Keeps live-track correctness while offering Comlink-shaped control like `audio-worklet-rpc`.

**Alternatives considered:** Hand-typed port protocol only (strategy A) — enough for many apps; forcing Comlink for all track-processor users — unnecessary dependency weight; running all transforms inside a Dedicated Worker by default — optional later, not required for v1 rpc parity.

### Packaging

**Choice:**

- ESM subpaths for track-processor modules and worker script(s), e.g. `@bengreenier/react-user-media/video/track-processor`, `.../video/worker`
- Overrides: `createWorker`, module/URL injection for tests/bundlers
- `comlink` on worker and track-rpc entry paths; track-processor-only consumers should not need Comlink if split correctly
- Document CJS limitation

**Rationale:** Same packaging lessons as audio.

### Implementation phases

1. Shared types + **video-track-processor** (metrics/passthrough + stream hook)
2. **video-worker** (Comlink job API + hook)
3. **video-track-rpc** (Comlink control; reuse track-processor path)

**Rationale:** Live camera case first; each phase independently demoable/testable—mirrors audio’s worklet → worker → worklet-rpc order.

### Contrast with PR #6

**Choice:** Do not reuse PR #6’s hand-rolled message enums or recorder-in-worker scope. Keep WebCodecs direction on the Comlink worker path only as a bounded v1 encode/summary proving surface.

## Risks / Trade-offs

- **[Risk] Three strategies increase API/doc surface** → Mitigation: selection guide, shared types, phased ship, subpath exports
- **[Risk] `VideoFrame` close leaks** → Mitigation: strict close rules in transform and worker; browser tests
- **[Risk] Track processor / insertable streams browser support gaps** → Mitigation: capability checks → error state; document supported browsers
- **[Risk] Transform hot path blocked by heavy work or Comlink awaits** → Mitigation: spec forbids awaits in hot path; push heavy work to worker strategy
- **[Risk] Module URL / packaging pain** → Mitigation: overrides + ESM docs
- **[Risk] Drift from audio sibling patterns** → Mitigation: shared review checklist (lifecycle, ownership, overrides)
- **[Trade-off] Spec all three before all are implemented** → Accepted; tasks phased with checkboxes
- **[Trade-off] Narrow v1 encode/CV surface** → Accepted; expand via follow-up deltas

## Migration Plan

- Additive APIs only; no breaking changes to existing hooks or audio strategies
- Minor version bump when first video strategy ships; subsequent strategies additive
- Remove superseded planning-only `add-video-worker` if present
- Rollback: remove new video exports/deps as needed; `comlink` remains for audio

## Open Questions

- Exact public names: `useMediaVideoProcessor` vs separate `useVideoTrackProcessor` / `useVideoTrackRpc` (lean: strategy param on stream hook + dedicated `useVideoWorker`, mirroring audio)
- Whether track-rpc is a separate npm subpath or `strategy: "track-rpc"` (lean: strategy flag reusing track-processor module + thin Comlink adapter)
- Default metric post rate and whether passthrough generator is always wired (lean: metrics-only path allowed; generator optional)
- Default codec string for worker encode demo (lean: probe via `isConfigSupported`)
