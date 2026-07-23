## Context

`@bengreenier/react-user-media` acquires streams (`useMedia`), observes audio tracks, plays (`AudioPlayer`), and records (`useMediaRecorder`). There is no signal-processing path on main. Draft PR #6 explored hand-rolled workers + WebCodecs; this change does not revive it.

Consumers need different primitives for different jobs. This design specs **three strategies** under one shared family so callers pick by workload, with common types and lifecycle conventions.

Library constraints: React 19 peer, tsup CJS+ESM, Vitest browser tests, secure context, ESM-first module URLs for worklets/workers.

## Goals / Non-Goals

**Goals:**

- Shared contracts: `AudioFrame`, `AudioProcessOptions`, `AudioProcessResult`, discriminated idle/loading/ready/error, session invalidation, no default track-stop
- Strategy A — **AudioWorklet realtime**: graph-native DSP on the audio thread
- Strategy B — **Dedicated Worker + Comlink**: async buffer jobs via `expose`/`wrap`/`transfer`/`proxy`
- Strategy C — **Worklet + Comlink RPC**: `process()` stays sync; Comlink models port control/results
- Clear selection guidance; phased ship order; tree-shake-friendly subpath exports where practical
- **Forward compatibility:** architecture MUST NOT preclude a future change adding video processing and/or WebCodecs on this library (especially via the worker + Comlink job path)

**Non-Goals (deferred, not forbidden):**

- One strategy pretending to cover all workloads
- Shipping video strategies or WebCodecs APIs in *this* change
- Replacing MediaRecorder
- CJS-default worker/worklet factories without overrides
- Heavy DSP suite beyond a v1 level-meter proving each path

## Selection guide

```
  Need                              Use
  ─────────────────────────────────────────────────────
  Live mic meters / FX / VAD-lite   audio-worklet
  Offline / heavy / buffer jobs     audio-worker (Comlink)
  Live DSP + typed configure/sub    audio-worklet-rpc
```

## Decisions

### One family, three capabilities

**Choice:** Three OpenSpec capabilities (`audio-worklet`, `audio-worker`, `audio-worklet-rpc`) sharing types and lifecycle rules. React surface:

- `useMediaAudioProcessor(media, { strategy: "worklet" | "worklet-rpc", ... })` for stream-oriented paths
- `useAudioWorker(options?)` for buffer/job-oriented path (`strategy: "worker"` implicit)
- Optional unified overload later; not required for v1

**Rationale:** Lets consumers choose tradeoffs without learning three unrelated products; keeps specs separable for phased delivery.

**Alternatives considered:** Single capability with only worklet (too narrow); worker-only + Comlink (rejects realtime); three unrelated hook families (DX tax).

### Shared types and ownership

**Choice:** Public shared types for frames/results/options. Media-capture owns `MediaStream` lifecycle. Processors MUST NOT call `getUserMedia` and MUST NOT stop tracks on unmount by default. Hooks follow boolean discriminants + generation/session ids (ignore late results after restart).

**Rationale:** Matches existing library conventions (`useMedia`, `useMediaRecorder`).

### Forward compatibility: video and WebCodecs

**Choice:** This change ships **audio-only** APIs, but treats video/WebCodecs as a planned extension surface—not a closed door:

- Keep lifecycle/session/ownership rules **media-kind agnostic** (idle/loading/ready/error, no default track-stop, ESM module overrides) so a future `video-*` capability can mirror them
- Prefer namespaced audio types (`AudioFrame`, `useAudioWorker`, `audio-worklet` subpath) over sealing a single global `MediaProcessor` that only fits PCM—so video can add `VideoFrame` / WebCodecs types beside them without a breaking rename
- Treat the **Comlink Dedicated Worker** path as the primary future home for WebCodecs (`AudioEncoder`/`VideoEncoder`, transferable `AudioData`/`VideoFrame`): same `configure` / process / `subscribe` / `dispose` + `transfer` shape
- Do **not** hard-wire worker internals to “Float32 PCM forever” in a way that blocks transferring other frame types later (keep frame handling behind typed process methods / narrow modules)
- AudioWorklet remains audio-specific (correct); video realtime would be a separate future primitive (e.g. `MediaStreamTrackProcessor` / transform streams), not forced through AudioWorklet

**Rationale:** Priority is audio now; consumers and the library should still be able to grow into video/WebCodecs without throwing away the processing family.

**Alternatives considered:** Listing video/WebCodecs as absolute non-goals—over-constrains the product; implementing WebCodecs in this change—out of priority/scope.

### Strategy A — AudioWorklet realtime

**Choice:**

```
  MediaStream → MediaStreamAudioSourceNode → AudioWorkletNode → silent Gain / destination
```

Processor implements sync `process(inputs, outputs, parameters)`. v1 built-in: RMS/peak (and optional passthrough to outputs). Metrics to main via `port.postMessage` at a throttled rate (e.g. ≤60 Hz), not every quantum. Hook handles `audioWorklet.addModule`, context create/resume (user-gesture aware), graph connect/teardown.

**Rationale:** Correct clock for live stream DSP; avoids main-thread frame pull.

**Alternatives considered:** AnalyserNode-only on main — simpler but not an extensible processing strategy; Dedicated Worker as primary — wrong clock.

### Strategy B — Dedicated Worker + Comlink

**Choice:** Depend on [`comlink`](https://www.npmjs.com/package/comlink) (GoogleChromeLabs). Worker `Comlink.expose`s:

```ts
interface AudioWorkerApi {
  configure(options: AudioProcessOptions): Promise<void>;
  processFrame(frame: AudioFrame): Promise<AudioProcessResult>;
  subscribe(onResult: (r: AudioProcessResult) => void): Promise<void>;
  dispose(): Promise<void>;
}
```

Hot path uses `Comlink.transfer` for `ArrayBuffer`s. Main `Comlink.wrap`; teardown `releaseProxy` + `terminate`. Optional thin bridge can pull PCM from a stream for convenience, but docs steer live realtime use to worklet.

**Rationale:** Best DX for async jobs; transfer avoids structured-clone copies.

### Strategy C — Worklet + Comlink on port

**Choice:** Same realtime `process()` as strategy A. Main thread `Comlink.wrap(audioWorkletNode.port)`; worklet side `Comlink.expose(controlApi, port)` for `configure` / `subscribe` / `dispose`. **No awaits inside `process()`** — configure mutates processor fields; results are queued/posted from process or a timer coalesced on the worklet side without blocking the quantum.

**Rationale:** Keeps audio-thread correctness while giving Comlink-shaped control plane for consumers who want it.

**Alternatives considered:** Hand-typed port protocol only (strategy A) — enough for many apps; forcing Comlink for all worklet users — unnecessary dependency weight.

### Packaging

**Choice:**

- ESM subpaths for worklet module(s) and worker script(s), e.g. `@bengreenier/react-user-media/audio-worklet`, `.../audio-worker`
- `addModule(url)` / `new Worker(url, { type: "module" })` via `import.meta.url` factories
- Overrides: `workletModuleUrl`, `createWorker`, etc. for tests/bundlers
- `comlink` as a dependency of worker and worklet-rpc entry paths; worklet-only consumers should not need to load Comlink if split correctly
- Document CJS limitation

**Rationale:** Dual publish makes default URL workers/worklets unreliable under `require`.

### Implementation phases

1. Shared types + **audio-worklet** (level meter + hook)
2. **audio-worker** (Comlink job API + hook)
3. **audio-worklet-rpc** (Comlink on port; reuse worklet DSP)

**Rationale:** Delivers the common live-mic case first; each phase is independently demoable/testable.

### Contrast with PR #6 / prior change

**Choice:** Do not reuse PR #6’s hand-rolled message enums. Supersede planning change `add-audio-worker-comlink` (worker-only). WebCodecs ideas from that exploration remain valid for a **future** change on the Comlink worker path—not in this delivery.

## Risks / Trade-offs

- **[Risk] Three strategies increase API/doc surface** → Mitigation: selection guide, shared types, phased ship, subpath exports
- **[Risk] Worklet `process()` glitches if too heavy** → Mitigation: keep v1 metering cheap; document budget; push heavy work to worker strategy
- **[Risk] Comlink on worklet port misused inside process** → Mitigation: spec forbids async in process; code review + tests
- **[Risk] Module URL / COOP packaging pain** → Mitigation: overrides + ESM docs; avoid SharedArrayBuffer requirement for v1
- **[Risk] AudioContext suspended until gesture** → Mitigation: loading/error states; resume helper documented
- **[Risk] Audio-first naming paints a corner against video** → Mitigation: namespaced audio modules/types; shared lifecycle conventions; worker transfer path kept frame-type-pluggable
- **[Trade-off] Spec all three before all are implemented** → Accepted; tasks are phased with checkboxes
- **[Trade-off] Defer WebCodecs/video** → Accepted for priority; extensibility decision above is mandatory

## Migration Plan

- Additive APIs only; no breaking changes to existing hooks
- Minor version bump when first strategy ships; subsequent strategies additive
- Remove superseded OpenSpec change `add-audio-worker-comlink` from `openspec/changes/`
- Rollback: remove new exports/deps; no data migration

## Open Questions

- Exact public names: `useMediaAudioProcessor` vs `useAudioWorklet` / `useAudioWorkletRpc` as separate exports (lean: strategy param on stream hook + dedicated `useAudioWorker`)
- Whether worklet-rpc is a separate npm subpath or a `strategy: "worklet-rpc"` flag (lean: strategy flag reusing worklet module + thin Comlink adapter)
- Default metric post rate and whether results are per-channel or mixed (lean: mixed summary + optional per-channel in result type)
- When to open a follow-up change for WebCodecs/video (after worker path ships vs. parallel spike)
