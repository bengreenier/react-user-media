## ADDED Requirements

### Requirement: Comlink-exposed worker API
The library SHALL ship a Dedicated Worker module that exposes an audio job API via `Comlink.expose`. The main thread SHALL obtain a typed proxy with `Comlink.wrap`. The shared TypeScript contract SHALL include at least `configure`, `processFrame`, and `dispose`. Proxy method results SHALL be awaitable.

#### Scenario: Wrap and configure
- **WHEN** the consumer creates the library audio worker and wraps it with Comlink
- **THEN** awaiting `configure` with valid options resolves and subsequent `processFrame` calls are accepted

#### Scenario: Dispose fails closed
- **WHEN** the consumer awaits `dispose` on the proxy
- **THEN** further `processFrame` calls reject or otherwise fail closed and worker-owned state is cleared

### Requirement: Transferable PCM frames
`processFrame` SHALL accept PCM frame data movable with `Comlink.transfer` so `ArrayBuffer` ownership transfers to the worker on the hot path. After a successful transfer of a buffer used as an argument, that buffer MUST NOT remain usable on the calling thread (detached / zero-length semantics).

#### Scenario: Process transferred frame
- **WHEN** the consumer calls `processFrame` with channel data wrapped in `Comlink.transfer`
- **THEN** the worker returns an `AudioProcessResult`
- **AND** the transferred `ArrayBuffer` is detached on the caller side

### Requirement: Built-in level analysis
After configuration, `processFrame` SHALL support at least RMS and peak computation over the provided frame, returned as `AudioProcessResult` using the shared type family.

#### Scenario: RMS and peak for a known frame
- **WHEN** the consumer processes a frame of known constant amplitude
- **THEN** the result’s peak reflects that amplitude and RMS is within an accepted numeric tolerance

### Requirement: Optional subscription via Comlink.proxy
The worker API MAY expose `subscribe(onResult)` where `onResult` is passed with `Comlink.proxy`. Unsubscribe or `dispose` MUST stop further callbacks for that session.

#### Scenario: Proxied callback receives results
- **WHEN** the consumer subscribes with a proxied callback and processes frames
- **THEN** the callback is invoked with `AudioProcessResult` values
- **WHEN** the consumer disposes the API
- **THEN** no further subscription callbacks are delivered for that session

### Requirement: `useAudioWorker` lifecycle hook
The library SHALL export `useAudioWorker` that manages worker creation and Comlink wrap/release with idle/loading/ready/error state. Unmount and stop MUST `releaseProxy` and `worker.terminate()`. A session/generation id MUST ignore late results after restart.

#### Scenario: Ready after start
- **WHEN** the consumer starts the hook and the worker initializes successfully
- **THEN** state is ready and a usable Comlink proxy API is available

#### Scenario: Cleanup on unmount
- **WHEN** the component unmounts while a worker is active
- **THEN** the proxy is released and the worker is terminated

#### Scenario: Ignores late results after restart
- **WHEN** the consumer restarts the worker and a previous instance later delivers a result
- **THEN** the new session’s ready-state data is not overwritten by the stale result

#### Scenario: Init failure
- **WHEN** worker construction or Comlink setup fails
- **THEN** state is error, ready is false, and no leaked worker remains owned by the hook

### Requirement: Stream bridge does not own capture
If a convenience bridge feeds `MediaStream` PCM into the worker, it MUST NOT call `getUserMedia` and MUST NOT stop tracks on the provided stream by default when the bridge stops. Docs SHOULD steer realtime live-stream DSP to the worklet strategy.

#### Scenario: Bridge stop leaves tracks running
- **WHEN** a stream-fed worker bridge stops
- **THEN** tracks on the provided `MediaStream` remain in their prior `readyState`

### Requirement: ESM worker packaging and overrides
The package SHALL provide an ESM-consumable worker factory or URL. Consumers MUST be able to override worker creation for tests and bundlers. Default CJS `require` without an override MAY be unsupported and MUST be documented.

#### Scenario: Custom createWorker in tests
- **WHEN** the consumer supplies a `createWorker` override returning a Comlink-compatible endpoint
- **THEN** `useAudioWorker` can reach ready state without the production worker script

### Requirement: Extensible job surface for future media kinds
The worker + Comlink lifecycle (`configure`, frame processing, optional `subscribe`, `dispose`, transferable payloads, hook session cleanup) SHALL be structured so a future library change can add video and/or WebCodecs job APIs without replacing that lifecycle. This change MUST NOT ship video or WebCodecs APIs; audio PCM remains the only implemented frame kind.

#### Scenario: Audio-only in this change
- **WHEN** a consumer uses the shipped worker API from this change
- **THEN** only audio PCM processing APIs are available (no WebCodecs encode/decode or video frame processors yet)

#### Scenario: Lifecycle shape stays reusable
- **WHEN** maintainers review the public worker control surface
- **THEN** it still follows configure / process / subscribe / dispose with transfer-friendly payloads suitable for later non-PCM frame types
