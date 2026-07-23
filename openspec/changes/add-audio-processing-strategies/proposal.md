## Why

The library captures media but offers no off-main-thread processing path. Different workloads need different browser primitives: **AudioWorklet** for realtime graph DSP, a **Dedicated Worker + Comlink** for async buffer jobs, and **Comlink on the worklet port** when consumers want typed configure/subscribe without hand-rolled messages. Speccing all three as one family lets consumers pick the right tradeoff. This change prioritizes **audio**, but the patterns (lifecycle, Comlink jobs, transferables, ESM module packaging) MUST leave the door open for later **video / WebCodecs** work on the same library.

## What Changes

- Add a shared media-processing type/lifecycle family for audio first (frame/result/options, idle/loading/ready/error, stream ownership stays in media-capture), structured so video/WebCodecs can reuse the same conventions later
- Add **AudioWorklet realtime** strategy: `MediaStream` → Web Audio graph → `AudioWorkletProcessor.process()`
- Add **Dedicated Worker + Comlink** strategy: `expose`/`wrap`/`transfer` job API for PCM buffers (natural on-ramp for future WebCodecs encode/decode jobs)
- Add **Worklet + Comlink RPC** strategy: realtime `process()` plus Comlink on `AudioWorkletNode.port` for control/results
- Ship ESM-first module URLs for worklet and worker scripts; allow `create*` / URL overrides
- Phased implementation: worklet → worker → worklet-rpc; shared types first
- Examples + browser tests per strategy; selection guide in docs

## Non-goals (this change only)

- Implementing video processors, WebCodecs encode/decode APIs, or video strategies in this change (deferred; must remain possible)
- Replacing `useMediaRecorder` or owning `getUserMedia` / track teardown by default
- SharedWorker, ServiceWorker
- Reviving draft PR #6’s hand-rolled message protocol wholesale (WebCodecs direction may return in a future change on the Comlink worker path)
- Guaranteeing default factories under CJS `require` without overrides
- Shipping a full DSP plugin marketplace (v1: level meter + extensibility hooks)

## Capabilities

### New Capabilities

- `audio-worklet`: Realtime AudioWorklet processing of live `MediaStream` audio in the Web Audio graph, with React lifecycle hooks and port-based metrics.
- `audio-worker`: Comlink-backed Dedicated Worker API and hooks for async PCM frame jobs (`processFrame` + transferables).
- `audio-worklet-rpc`: Comlink RPC layered on `AudioWorkletNode.port` for typed configure/subscribe while DSP remains in `process()`.

### Modified Capabilities

- (none — `openspec/specs/` is empty; baseline changes are documentation-only)

## Impact

- Package: `packages/react-user-media` — shared audio types, worklet + worker modules, hooks, `comlink` dependency, multi-entry packaging/exports
- Examples: demos for at least worklet metering; optional worker/rpc demos
- Tests: Vitest browser coverage per strategy; shared lifecycle contracts
- Docs: strategy selection guide; ESM module URL / override notes
- Supersedes planning-only change `add-audio-worker-comlink` (worker-only intent)
