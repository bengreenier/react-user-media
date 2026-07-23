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

`@bengreenier/react-user-media/audio-worker` provides `createAudioWorker()`.
CommonJS consumers and test runners can pass `createWorker` to `useAudioWorker`
instead. `useAudioWorker` never acquires capture or stops tracks.

The worker surface uses `configure` / process / `subscribe` / `dispose` so a
future WebCodecs / `VideoFrame` job API can share the same lifecycle without
replacing these audio APIs.

### Worklet RPC

Import `useMediaAudioWorkletRpc` from
`@bengreenier/react-user-media/audio-worklet-rpc` (not the package root) so
default importers do not pull Comlink. Realtime DSP stays in synchronous
`process()`; configure/subscribe use Comlink on the worklet `MessagePort`.

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
