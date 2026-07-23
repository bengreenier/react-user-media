## Why

The library captures media and ships a three-strategy **audio** processing family (worklet, Comlink worker, worklet-rpc), but has no equivalent for **video**. Consumers need the same choice by workload: live track transforms, async frame/WebCodecs jobs, and typed configure/subscribe on the live path—without reviving draft PR #6’s hand-rolled protocol.

## What Changes

- Add a shared video-processing type/lifecycle family (frames/results/options, idle/loading/ready/error, stream ownership stays in media-capture), parallel to audio
- Add **MediaStreamTrackProcessor realtime** strategy: live `MediaStream` video track → processor → transform → optional generator / metrics
- Add **Dedicated Worker + Comlink** strategy: `expose`/`wrap`/`transfer` job API for `VideoFrame` / WebCodecs jobs
- Add **Track-processor + Comlink RPC** strategy: realtime frame path plus Comlink control/results without blocking the transform hot path
- Ship ESM-first module URLs for track-processor helpers and worker scripts; allow factory / URL overrides
- Phased implementation: track-processor → worker → track-rpc; shared types first
- Examples + browser tests per strategy; selection guide in docs

## Non-goals

- Reviving draft PR #6’s hand-rolled message protocol or mock-worker recorder surface wholesale
- Replacing `useMediaRecorder` or owning `getUserMedia` / `getDisplayMedia` / track teardown by default
- SharedWorker, ServiceWorker, or forcing video through AudioWorklet
- Shipping a full WebCodecs / DSP marketplace (v1: frame summary / light transform + extensibility hooks; optional encode probe on worker)
- Changing existing `audio-*` public contracts
- Guaranteeing default factories under CJS `require` without overrides

## Capabilities

### New Capabilities

- `video-track-processor`: Realtime `MediaStreamTrackProcessor` / transform-stream processing of live video tracks, with React lifecycle hooks and throttled metrics.
- `video-worker`: Comlink-backed Dedicated Worker API and hooks for async `VideoFrame` / WebCodecs jobs (`processFrame` + transferables).
- `video-track-rpc`: Comlink RPC layered on the track-processor control plane for typed configure/subscribe while frame handling stays on the realtime path.

### Modified Capabilities

- (none — baselines / audio strategies remain siblings; `openspec/specs/` may still be empty)

## Impact

- Package: `packages/react-user-media` — shared video types, track-processor + worker + rpc modules, hooks, `comlink` reuse, multi-entry packaging/exports
- Examples: demos for at least track-processor metrics; optional worker/rpc demos
- Tests: Vitest browser coverage per strategy; shared lifecycle contracts
- Docs: strategy selection guide; ESM module URL / override notes
- Completes the video side of the processing family deferred by `add-audio-processing-strategies`
