## 1. Shared foundation

- [ ] 1.1 Define shared public video types: `VideoJobFrame`, `VideoProcessOptions`, `VideoProcessResult`, and strategy/lifecycle unions (video-namespaced beside audio)
- [ ] 1.2 Document strategy selection guide in README (track-processor vs worker vs track-rpc); note audio siblings remain separate
- [ ] 1.3 Add packaging stubs for ESM subpaths and override options (`createWorker`, processor/pipeline factories)
- [ ] 1.4 Design-review checkpoint: worker + track-processor + track-rpc lifecycles stay parallel to audio’s three strategies

## 2. Phase 1 — MediaStreamTrackProcessor realtime

- [ ] 2.1 Implement default track-processor transform with frame close discipline and throttled summary metrics
- [ ] 2.2 Capability-detect `MediaStreamTrackProcessor`; fail closed to error state when missing
- [ ] 2.3 Implement stream hook for `strategy: "track"` (pipeline wire-up, teardown, session ids, no track stop)
- [ ] 2.4 Tests: setup failure → error; cleanup; tracks not stopped; metrics from synthetic/live video
- [ ] 2.5 Examples demo: live frame summary via track processor

## 3. Phase 2 — Dedicated Worker + Comlink

- [ ] 3.1 Implement worker `Comlink.expose` API (`configure` / `processFrame` / `subscribe` / `dispose`)
- [ ] 3.2 Support `Comlink.transfer` on `VideoFrame`; close frames after jobs; built-in summary + optional WebCodecs encode with `isConfigSupported`
- [ ] 3.3 Implement `useVideoWorker` with releaseProxy + terminate + overrides
- [ ] 3.4 Optional stream→frame bridge that does not stop tracks; docs point realtime to track-processor
- [ ] 3.5 Tests: transfer/close; lifecycle/restart; subscribe+proxy; createWorker override; encode unsupported path
- [ ] 3.6 Optional examples demo for buffer/job path

## 4. Phase 3 — Track processor + Comlink RPC

- [ ] 4.1 Expose Comlink control API on the track-processor session port without awaits inside the per-frame transform
- [ ] 4.2 Wire `strategy: "track-rpc"` (or dedicated export) reusing track-processor path + shared lifecycle
- [ ] 4.3 Ensure track-only path can avoid loading Comlink when packaged as a separate entry
- [ ] 4.4 Tests: configure/subscribe via proxy; transform stays free of Comlink awaits; cleanup releases proxy+pipeline; tracks not stopped
- [ ] 4.5 Optional examples demo for track-rpc configure/subscribe

## 5. Verification

- [ ] 5.1 Run package tests and lint; fix regressions (including existing audio strategy tests)
- [ ] 5.2 Validate change with `OPENSPEC_TELEMETRY=0 npx --yes @fission-ai/openspec validate add-video-processing-strategies`
- [ ] 5.3 Confirm superseded planning-only `add-video-worker` is absent from `openspec/changes/`
