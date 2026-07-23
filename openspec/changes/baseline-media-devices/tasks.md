## 1. Spec coverage verification

- [x] 1.1 Confirm `useMediaDevices` idle-on-mount and no auto-request match scenarios in `specs/media-devices/spec.md` against `use-media-devices.ts` / `use-media-devices.spec.tsx`
- [x] 1.2 Confirm loading → ready | error, secure-context error message, and filter (including throw + latest-filter) scenarios match existing tests
- [x] 1.3 Confirm `deviceChangedEvent` default/opt-out and stale/unmount generation scenarios match existing tests
- [x] 1.4 Confirm extension hooks (`useMediaAudioDevices`, `useMediaAudioInputDevices`, `useMediaAudioOutputDevices`, `useMediaVideoDevices`) kind filters match spec scenarios

## 2. Regression checks

- [x] 2.1 Run package tests for media devices: `pnpm --filter @bengreenier/react-user-media test -- use-media-devices`
- [x] 2.2 Confirm public exports of hooks and types remain available from package entry (`hooks/index.ts` / `src/index.ts`) with no source edits required

## 3. OpenSpec hygiene

- [x] 3.1 Run `OPENSPEC_TELEMETRY=0 npx --yes @fission-ai/openspec validate --change baseline-media-devices` and resolve any reported issues
- [x] 3.2 Optionally archive/sync this capability into `openspec/specs/media-devices/` in a follow-up (out of scope for apply of this baseline) (deferred — keep as change delta)
