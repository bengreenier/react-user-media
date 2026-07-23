## ADDED Requirements

### Requirement: Explicit request lifecycle with idle default
`useMediaDevices` MUST start in an idle state and MUST NOT call `enumerateDevices` on mount. Callers MUST obtain devices only by invoking `request()`.

#### Scenario: Idle before any request
- **WHEN** a component mounts `useMediaDevices` without calling `request()`
- **THEN** the hook returns `isLoading: false`, `isError: false`, `isReady: false`, `error: null`, and `devices: undefined`

#### Scenario: Mount is safe when mediaDevices is missing
- **WHEN** `navigator.mediaDevices` is unavailable and the hook mounts with default options
- **THEN** rendering MUST NOT throw and the hook MUST remain idle

### Requirement: Enumerate devices on request
Calling `request()` MUST transition through loading and then ready or error based on `navigator.mediaDevices.enumerateDevices`.

#### Scenario: Successful enumeration
- **WHEN** the caller invokes `request()` and `enumerateDevices` resolves with one or more `MediaDeviceInfo` values
- **THEN** the hook MUST set `isReady: true`, `isLoading: false`, `isError: false`, `error: null`, and `devices` to the (filtered) result list

#### Scenario: Loading clears prior devices
- **WHEN** the caller invokes `request()` while `enumerateDevices` is available
- **THEN** the hook MUST set `isLoading: true`, clear `devices` to `undefined`, and clear `error` to `null` before the promise settles

#### Scenario: Enumerate failure
- **WHEN** `enumerateDevices` rejects with an error
- **THEN** the hook MUST set `isError: true`, `isLoading: false`, `isReady: false`, `devices: undefined`, and `error` to that error (or a wrapped `Error`)

#### Scenario: enumerateDevices unavailable
- **WHEN** the caller invokes `request()` and `navigator.mediaDevices` or `enumerateDevices` is unavailable
- **THEN** the hook MUST set `isError: true`, `isLoading: false`, `isReady: false`, `devices: undefined`, and `error` with message `enumerateDevices is not available. Are you in a secure context?`

### Requirement: Optional device filter
`UseMediaDeviceOptions.filter` MUST limit which devices appear in the ready `devices` array. The default filter MUST include all devices. The filter in effect when a pending request resolves MUST be applied (latest filter via ref).

#### Scenario: Filter throws
- **WHEN** `enumerateDevices` resolves and the configured `filter` throws
- **THEN** the hook MUST set `isError: true`, `isLoading: false`, `devices: undefined`, and surface the thrown error (not remain loading)

#### Scenario: Latest filter applies to pending request
- **WHEN** `request()` is in flight and the caller changes `filter` before the promise resolves
- **THEN** the ready `devices` list MUST reflect the latest filter, not the filter from request start

### Requirement: devicechange monitoring
When `deviceChangedEvent` is `true` (the default), the hook MUST listen for `navigator.mediaDevices` `devicechange` and re-invoke `request()`. When `deviceChangedEvent` is `false`, the hook MUST NOT re-request on `devicechange`.

#### Scenario: Re-request on devicechange
- **WHEN** `deviceChangedEvent` is `true` and a `devicechange` event fires after a successful request
- **THEN** the hook MUST call `enumerateDevices` again and update `devices` with the new result

#### Scenario: Opt out of devicechange
- **WHEN** `deviceChangedEvent` is `false` and a `devicechange` event fires
- **THEN** the hook MUST NOT call `enumerateDevices` again solely because of that event

### Requirement: Ignore stale async results
Concurrent or superseded `enumerateDevices` outcomes MUST NOT overwrite newer state. Unmount MUST invalidate in-flight requests.

#### Scenario: Newer request wins over stale success
- **WHEN** two `request()` calls overlap and the older promise resolves after the newer one has already produced ready state
- **THEN** the hook MUST keep the newer ready result and MUST NOT replace it with the stale device list

#### Scenario: Newer request wins over stale rejection
- **WHEN** two `request()` calls overlap, the newer request succeeds, and the older promise later rejects
- **THEN** the hook MUST remain ready with the newer devices and MUST NOT transition to error from the stale rejection

#### Scenario: Results after unmount are ignored
- **WHEN** the component unmounts while `enumerateDevices` is pending and the promise later resolves
- **THEN** the hook MUST NOT apply that result to React state (no post-unmount update from that generation)

### Requirement: Kind-filtered extension hooks
The package MUST export convenience hooks that wrap `useMediaDevices` with kind filters, still accepting `UseMediaDeviceOptions` and composing with a caller `filter` when provided.

#### Scenario: Audio and video kind prefixes
- **WHEN** `useMediaAudioDevices` and `useMediaVideoDevices` request devices from a mixed list
- **THEN** audio MUST include devices whose `kind` starts with `audio`, and video MUST include devices whose `kind` starts with `video`

#### Scenario: Audio input and output exact kinds
- **WHEN** `useMediaAudioInputDevices` and `useMediaAudioOutputDevices` request devices from a mixed list
- **THEN** input MUST include only `kind === "audioinput"` and output MUST include only `kind === "audiooutput"`
