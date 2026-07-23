## ADDED Requirements

### Requirement: User and display media acquisition
`useMedia` MUST accept a `type` of `"user"` or `"display"`. When `type` is `"user"`, `request` MUST obtain media via `navigator.mediaDevices.getUserMedia`. When `type` is `"display"`, `request` MUST obtain media via `navigator.mediaDevices.getDisplayMedia`. Optional request arguments MUST be forwarded to the corresponding browser API (`MediaStreamConstraints` for user, `DisplayMediaStreamOptions` for display).

#### Scenario: User media request uses getUserMedia
- **WHEN** a consumer calls `useMedia("user")` and invokes `request` with constraints
- **THEN** the hook MUST call `navigator.mediaDevices.getUserMedia` with those constraints
- **AND** on success enter the ready state with the returned `MediaStream`

#### Scenario: Display media request uses getDisplayMedia
- **WHEN** a consumer calls `useMedia("display")` and invokes `request` with options (for example `{ video: true }`)
- **THEN** the hook MUST call `navigator.mediaDevices.getDisplayMedia` with those options
- **AND** on success enter the ready state with the returned `MediaStream`

### Requirement: Discriminated media state
`useMedia` MUST expose a discriminated state shape with mutually exclusive idle, loading, ready, and error modes, plus `request` and `stop` actions on every mode.

- Idle: `isLoading: false`, `isError: false`, `isReady: false`, `error: null`, `media: undefined`
- Loading: `isLoading: true`, `isError: false`, `isReady: false`, `error: null`, `media: undefined`
- Ready: `isLoading: false`, `isError: false`, `isReady: true`, `error: null`, `media: MediaStream`
- Error: `isLoading: false`, `isError: true`, `isReady: false`, `error: Error`, `media: undefined`

#### Scenario: Initial state is idle
- **WHEN** `useMedia` mounts before any `request`
- **THEN** the returned state MUST be idle (`isReady`, `isLoading`, and `isError` all false; `media` undefined; `error` null)

#### Scenario: Request transitions through loading to ready
- **WHEN** `request` is invoked and the browser media promise resolves with a stream
- **THEN** state MUST first reflect loading while the request is in flight
- **AND** then reflect ready with that stream as `media`

#### Scenario: Request failure yields error state
- **WHEN** `getUserMedia` rejects or throws synchronously
- **THEN** the hook MUST NOT throw to the caller
- **AND** state MUST become error with a non-null `Error` and undefined `media`

#### Scenario: Missing getUserMedia capability yields error
- **WHEN** `type` is `"user"` and `navigator.mediaDevices.getUserMedia` is unavailable
- **THEN** invoking `request` MUST set error state with a message indicating getUserMedia is not available
- **AND** MUST NOT throw

#### Scenario: Missing getDisplayMedia capability yields error
- **WHEN** `type` is `"display"` and `navigator.mediaDevices.getDisplayMedia` is unavailable
- **THEN** invoking `request` MUST set error state with a message indicating getDisplayMedia is not available
- **AND** MUST NOT throw

### Requirement: Stop returns to idle and releases media
`stop` MUST increment the request generation, stop tracks on the current stream via `closeMedia`, clear `media` and `error`, clear loading, and return the hook to idle.

#### Scenario: Stop clears ready user media
- **WHEN** the hook is ready with an active stream and the consumer calls `stop`
- **THEN** every track on that stream MUST be stopped
- **AND** state MUST return to idle with `media` undefined

### Requirement: Re-request closes the previous stream
When `request` is invoked while a prior stream is held, the hook MUST close the prior stream before starting the new acquisition.

#### Scenario: Re-request stops previous user media stream
- **WHEN** the hook is ready with stream A and the consumer calls `request` again
- **THEN** tracks on stream A MUST be stopped before stream B becomes ready
- **AND** ready state MUST expose stream B

### Requirement: Stale in-flight requests must not leak or overwrite newer state
The hook MUST track request generations so that outcomes from superseded requests do not replace newer media or loading/error state. Streams that resolve after being superseded MUST be closed.

#### Scenario: Stale promise after stop and re-request does not replace newer media
- **WHEN** an in-flight user media request is stopped, a newer request is started, the newer request resolves first, and then the older request resolves
- **THEN** ready state MUST keep the newer stream
- **AND** the older stream's tracks MUST be stopped
- **AND** the newer stream's tracks MUST remain live

#### Scenario: Stream resolving after unmount is closed
- **WHEN** `request` is in flight, the component unmounts, and the media promise later resolves
- **THEN** the resolved stream's tracks MUST be stopped
- **AND** the unmounted component MUST NOT retain the stream as active media

#### Scenario: In-flight user media ignored after type changes to display
- **WHEN** `useMedia("user")` has an in-flight request and the `type` prop changes to `"display"`
- **THEN** state MUST reset to idle without that user stream
- **AND** when the stale user media promise later resolves, its tracks MUST be stopped
- **AND** state MUST remain idle (or otherwise not adopt that user stream)

### Requirement: Unmount and type-change cleanup
Changing `type` or unmounting MUST bump the request generation and close any currently held stream so tracks are not left live.

#### Scenario: Unmount cleanup stops ready user media tracks
- **WHEN** the hook is ready with an active stream and the component unmounts
- **THEN** every track on that stream MUST be stopped

#### Scenario: Type change closes held media and resets state
- **WHEN** `type` changes while the hook holds media or has an in-flight request
- **THEN** the hook MUST close any held stream, clear error/loading/media, and return to idle for the new type

### Requirement: closeMedia stops all tracks
`closeMedia` MUST accept `MediaStream | undefined`. When given a stream, it MUST call `stop()` on every track from `getTracks()`. When given `undefined`, it MUST return without throwing.

#### Scenario: closeMedia stops every track on the stream
- **WHEN** `closeMedia` is called with a stream that has multiple tracks
- **THEN** each track's `stop` MUST be invoked once

#### Scenario: closeMedia accepts undefined without throwing
- **WHEN** `closeMedia(undefined)` is called
- **THEN** it MUST NOT throw

### Requirement: getSupportedConstraints safe default
`getSupportedConstraints` MUST return `navigator.mediaDevices.getSupportedConstraints()` when available, otherwise an empty object. It MUST NOT throw when `navigator` or `mediaDevices` is missing.

#### Scenario: Missing mediaDevices returns empty object
- **WHEN** `navigator.mediaDevices` is undefined
- **THEN** `getSupportedConstraints()` MUST return `{}`

#### Scenario: Missing navigator returns empty object
- **WHEN** `globalThis.navigator` is unavailable
- **THEN** `getSupportedConstraints()` MUST return `{}`
