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

## Audio processing strategies

Choose the browser primitive that matches the workload:

| Need | Strategy |
| --- | --- |
| Live microphone meters, lightweight effects, or VAD-lite | `audio-worklet` |
| Offline, heavy, or buffer-oriented jobs | `audio-worker` (planned) |
| Live DSP with an RPC-shaped control plane | `audio-worklet-rpc` (planned) |

The worklet hook receives a caller-owned `MediaStream`; it creates a
`MediaStreamAudioSourceNode` → `AudioWorkletNode` → silent gain graph and
never stops the stream's tracks when stopped or unmounted.

`@bengreenier/react-user-media/audio-worklet` provides
`getLevelMeterWorkletModuleUrl()` and `addLevelMeterWorklet()` for ESM
consumers. Pass `workletModuleUrl` to `useMediaAudioProcessor` when testing or
when a bundler needs an explicit URL. The default module-relative URL is not
guaranteed under CJS `require`.

The worker surface deliberately uses `configure` / process / `subscribe` /
`dispose` lifecycle conventions and a `createWorker` override so a future
worker + Comlink implementation can accept transferable `VideoFrame` and
WebCodecs jobs without replacing the audio APIs.

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
