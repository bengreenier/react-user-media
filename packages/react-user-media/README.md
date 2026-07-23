# react-user-media

A collection of hooks and components for easier access to [`getUserMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [`getDisplayMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia), and [`enumerateDevices`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices) in [React](https://react.dev).

## Requirements

- **Consumers:** React 19+ (`peerDependencies`: `react >= 19`) and a secure context / modern browser APIs for `getUserMedia`, `getDisplayMedia`, and `enumerateDevices`
- **Contributing to this package:** Node.js 22.12+ (toolchain / CI for this monorepo; required by Vite 7)

## Hooks

- `useMedia('user')`
- `useMedia('display')`

- `useMediaTracks(...)`

  - `useMediaAudioTracks(...)`
  - `useMediaVideoTracks(...)`
  - `useTrackMuteState(...)`

- `useMediaDevices()`

  - `useMediaAudioInputDevices()`
  - `useMediaAudioOutputDevices()`
  - `useMediaVideoDevices()`

- `useMediaRecorder()`
- `useMediaAudioProcessor({ strategy: "worklet" })`
- `useAudioWorker()` — asynchronous PCM buffer jobs in a Dedicated Worker
- `useMediaVideoProcessor({ strategy: "track" })`
- `useVideoWorker()` — asynchronous `VideoFrame` / WebCodecs jobs in a Dedicated Worker

## Audio processing strategies

Choose the browser primitive that matches the workload:

| Need | Strategy |
| --- | --- |
| Live microphone meters, lightweight effects, or VAD-lite | `audio-worklet` (`useMediaAudioProcessor`) |
| Offline, heavy, or buffer-oriented jobs | `audio-worker` (`useAudioWorker` + Comlink) |
| Live DSP with an RPC-shaped control plane | `audio-worklet-rpc` (`useMediaAudioWorkletRpc` via `@bengreenier/react-user-media/audio-worklet-rpc`) |

### Worklet (realtime)

The worklet hook receives a caller-owned `MediaStream`; it creates a
`MediaStreamAudioSourceNode` → `AudioWorkletNode` → silent gain graph and
never stops the stream's tracks when stopped or unmounted.

`@bengreenier/react-user-media/audio-worklet` provides
`getLevelMeterWorkletModuleUrl()` and `addLevelMeterWorklet()` for ESM
consumers. Pass `workletModuleUrl` to `useMediaAudioProcessor` when testing or
when a bundler needs an explicit URL. The default module-relative URL is not
guaranteed under CJS `require`.

### Worker (async jobs)

Use `useAudioWorker()` for asynchronous or offline PCM jobs. Readiness changes
after asynchronous worker configuration, so call the ready Comlink proxy's
`processFrame` from an `isReady`-dependent effect or event handler. Wrap
`Float32Array` channel data in `Comlink.transfer` to avoid copying buffers. It
reports RMS and peak levels.

```tsx
import * as Comlink from "comlink";
import { useEffect } from "react";
import { useAudioWorker } from "@bengreenier/react-user-media";

function LevelAnalyzer() {
  const { api, isReady, start } = useAudioWorker();

  useEffect(() => {
    start();
  }, [start]);

  useEffect(() => {
    if (!isReady || !api) {
      return;
    }

    const samples = new Float32Array([0.5, -0.5]);
    void api.processFrame(
      Comlink.transfer(
        { channelData: [samples], sampleRate: 48_000 },
        [samples.buffer],
      ),
    );
  }, [api, isReady]);
}
```

`@bengreenier/react-user-media/audio-worker` provides `createAudioWorker()`
with a URL relative to that subpath entry. The root export of
`createAudioWorker` resolves the same script from `dist/index.js`. CommonJS
consumers and test runners can pass `createWorker` to `useAudioWorker`
instead. `useAudioWorker` never acquires capture or stops tracks.

The worker surface uses `configure` / process / `subscribe` / `dispose`. A
parallel video worker API shares the same lifecycle for `VideoFrame` /
WebCodecs jobs without replacing these audio APIs.

### Worklet RPC

Import `useMediaAudioWorkletRpc` from
`@bengreenier/react-user-media/audio-worklet-rpc` (not the package root) so
default importers do not pull Comlink. Realtime DSP stays in synchronous
`process()`; configure/subscribe use Comlink on the worklet `MessagePort`.

## Video processing strategies

Video mirrors the audio family with video-appropriate primitives. Audio and
video strategy APIs remain separate and namespaced.

| Need | Strategy |
| --- | --- |
| Live track meters / frame taps | `video-track-processor` (`useMediaVideoProcessor`) |
| Offline / heavy / WebCodecs buffer jobs | `video-worker` (`useVideoWorker` + Comlink) |
| Live path + typed configure/subscribe | `video-track-rpc` (`useMediaVideoTrackRpc` via `@bengreenier/react-user-media/video-track-rpc`) |

### Track processor (realtime)

`useMediaVideoProcessor({ strategy: "track" })` consumes a caller-owned
`MediaStream` video track via `MediaStreamTrackProcessor`, posts throttled
frame summaries, closes frames it does not keep, and never stops tracks on
stop/unmount. Pass `createPipeline` for tests when the browser API is missing.

`@bengreenier/react-user-media/video-track-processor` exports helpers such as
`createSummaryTrackPipeline` and `isMediaStreamTrackProcessorSupported`.

### Worker (async jobs)

Use `useVideoWorker()` for asynchronous `VideoFrame` / optional WebCodecs
encode jobs. Transfer frames with `Comlink.transfer({ frame }, [frame])`.
`@bengreenier/react-user-media/video-worker` provides `createVideoWorker()`
relative to that subpath; the root export resolves the same script from
`dist/index.js`. CommonJS consumers and tests can pass `createWorker`. An
optional `createVideoStreamWorkerBridge` can feed live frames into a ready
worker; it does not stop tracks—prefer the track-processor strategy for
continuous realtime work.

### Track RPC

Import `useMediaVideoTrackRpc` from
`@bengreenier/react-user-media/video-track-rpc` (not the package root) so
default importers do not pull Comlink. Per-frame handling stays free of
Comlink awaits; configure/subscribe use Comlink on a session `MessagePort`.

## Components

- `AudioPlayer`
- `VideoPlayer`

## Utility functions

- `getSupportedConstraints()`
- `closeMedia(...)`

## Contributing

Please feel free to open any issues or PRs!

### Building locally

This project uses [pnpm](https://pnpm.io) for dependency management. Local development requires **Node.js 22.12+** (Vite 7) and React 19 for the workspace packages.

Toolchain:

- **Lint / format:** [Biome](https://biomejs.dev) (`pnpm lint`, `pnpm format`)
- **Tests:** [Vitest](https://vitest.dev) 3 with Playwright browser mode
- **Examples / bundling:** [Vite](https://vite.dev) 7

Then just `pnpm run`:

- `build` - builds the project
- `dev` - starts hosting the examples for local development
- `test` - runs tests
- `lint` - runs Biome checks
- `format` - applies Biome formatting fixes

## License

Dual-licensed under Apache 2.0 + MIT.
