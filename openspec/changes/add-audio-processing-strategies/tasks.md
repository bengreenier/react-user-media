## 1. Shared foundation

- [ ] 1.1 Define shared public types: `AudioFrame`, `AudioProcessOptions`, `AudioProcessResult`, and strategy/lifecycle unions (audio-namespaced; do not seal a single PCM-only global processor type)
- [ ] 1.2 Document strategy selection guide in README (worklet vs worker vs worklet-rpc); note video/WebCodecs as future extensions on the worker/Comlink path
- [ ] 1.3 Add packaging stubs for ESM subpaths and override options (`workletModuleUrl`, `createWorker`)
- [ ] 1.4 Design-review checkpoint: worker job surface (`configure` / process / `subscribe` / `dispose` + transfer) remains plausible for future `VideoFrame` / WebCodecs jobs without a rewrite

## 2. Phase 1 — AudioWorklet realtime

- [ ] 2.1 Implement level-meter `AudioWorkletProcessor` with sync `process` and throttled port metrics
- [ ] 2.2 Build ESM worklet module emit + `addModule` factory
- [ ] 2.3 Implement stream hook for `strategy: "worklet"` (graph wire-up, context resume, teardown, session ids)
- [ ] 2.4 Tests: module failure → error; cleanup; tracks not stopped; levels from synthetic/live audio
- [ ] 2.5 Examples demo: live level meter via worklet

## 3. Phase 2 — Dedicated Worker + Comlink

- [ ] 3.1 Add `comlink` dependency; implement worker `Comlink.expose` API (`configure` / `processFrame` / `subscribe` / `dispose`)
- [ ] 3.2 Support `Comlink.transfer` on PCM buffers; built-in RMS/peak
- [ ] 3.3 Implement `useAudioWorker` with releaseProxy + terminate + overrides
- [ ] 3.4 Optional stream→PCM bridge that does not stop tracks; docs point realtime to worklet
- [ ] 3.5 Tests: transfer detachment; lifecycle/restart; subscribe+proxy; createWorker override
- [ ] 3.6 Optional examples demo for buffer/job path

## 4. Phase 3 — Worklet + Comlink RPC

- [x] 4.1 Expose Comlink control API on `AudioWorkletNode.port` without awaits inside `process`
- [x] 4.2 Wire `strategy: "worklet-rpc"` (or dedicated export) reusing worklet DSP + shared lifecycle
- [x] 4.3 Ensure worklet-only path can avoid loading Comlink when packaged as separate entry
- [x] 4.4 Tests: configure/subscribe via proxy; process stays sync; cleanup releases proxy+graph; tracks not stopped
- [x] 4.5 Optional examples demo for worklet-rpc configure/subscribe

## 5. Verification

- [x] 5.1 Run package tests and lint; fix regressions
- [x] 5.2 Validate change with `openspec validate add-audio-processing-strategies`
- [x] 5.3 Remove superseded change `add-audio-worker-comlink` from `openspec/changes/` if still present
