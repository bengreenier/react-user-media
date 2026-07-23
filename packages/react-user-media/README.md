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
- `useAudioWorker()` — asynchronous PCM buffer jobs in a Dedicated Worker

## Components

- `AudioPlayer`
- `VideoPlayer`

## Utility functions

- `getSupportedConstraints()`
- `closeMedia(...)`

## Audio processing strategies

Use `useAudioWorker()` for asynchronous or offline PCM jobs. Start it, then call
the ready Comlink proxy's `processFrame` with `Float32Array` channel data wrapped
in `Comlink.transfer` to avoid copying buffers. It reports RMS and peak levels.

```ts
const { api, isReady, start } = useAudioWorker();

start();
if (isReady && api) {
  const samples = new Float32Array([0.5, -0.5]);
  const result = await api.processFrame(
    Comlink.transfer(
      { channelData: [samples], sampleRate: 48_000 },
      [samples.buffer],
    ),
  );
}
```

This module worker factory is ESM-only. CommonJS consumers and test runners can
provide `createWorker` to `useAudioWorker` for their bundler-compatible worker.
`useAudioWorker` never acquires capture or stops tracks. Choose the audio-worklet
strategy for realtime live-stream DSP; this worker strategy is for buffer jobs.

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
