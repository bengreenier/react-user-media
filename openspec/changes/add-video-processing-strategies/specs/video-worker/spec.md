## ADDED Requirements

### Requirement: Comlink-exposed video worker API
The library SHALL ship a Dedicated Worker module that exposes a video job API via `Comlink.expose`. The main thread SHALL obtain a typed proxy with `Comlink.wrap`. The shared TypeScript contract SHALL include at least `configure`, `processFrame`, and `dispose`. Proxy method results SHALL be awaitable.

#### Scenario: Wrap and configure
- **WHEN** the consumer creates the library video worker and wraps it with Comlink
- **THEN** awaiting `configure` with valid options resolves and subsequent `processFrame` calls are accepted

#### Scenario: Dispose fails closed
- **WHEN** the consumer awaits `dispose` on the proxy
- **THEN** further `processFrame` calls reject or otherwise fail closed and worker-owned state (including open frames and encoder instances) is cleared

### Requirement: Transferable VideoFrame jobs
`processFrame` SHALL accept video frame data movable with `Comlink.transfer` so `VideoFrame` ownership transfers to the worker on the hot path. After a successful transfer, the caller MUST NOT continue to use that `VideoFrame` as a live frame on the calling thread. The worker MUST close each transferred frame it owns when the job completes successfully or fails, and MUST close any remaining owned frames during `dispose`.

#### Scenario: Process transferred frame
- **WHEN** the consumer calls `processFrame` with a `VideoFrame` wrapped in `Comlink.transfer`
- **THEN** the worker returns a `VideoProcessResult`
- **AND** the transferred `VideoFrame` is no longer usable on the caller side as a live frame

#### Scenario: Worker closes frame after job
- **WHEN** `processFrame` completes for a transferred frame (success or failure after ownership transfer)
- **THEN** the worker MUST close that frame so it is not retained across subsequent jobs

### Requirement: Built-in frame summary
After configuration for summary processing, `processFrame` SHALL return at least coded or display width and height, a timestamp, and enough format/metadata to identify the frame, using the shared video result type family.

#### Scenario: Summary for a known frame
- **WHEN** the consumer processes a transferred frame of known dimensions and timestamp
- **THEN** the result’s width, height, and timestamp reflect that frame within accepted tolerances

### Requirement: Optional WebCodecs encode mode
The worker API SHALL support an optional encode configuration mode that uses WebCodecs `VideoEncoder` inside the worker when available. Before relying on encode, the implementation MUST check support (for example `VideoEncoder.isConfigSupported`) and fail closed with a clear error when unsupported. Encode output MUST prefer transferable encoded payload(s) on the result.

#### Scenario: Encode when WebCodecs supported
- **WHEN** the consumer configures encode with a supported codec config and processes a transferred frame
- **THEN** the worker returns a result that includes encoded chunk data or metadata sufficient to consume the encode output

#### Scenario: Encode unsupported fails closed
- **WHEN** the consumer configures encode but WebCodecs is missing or the codec config is unsupported
- **THEN** `configure` or `processFrame` fails with a clear error
- **AND** the worker MUST NOT leave a half-initialized encoder owned across later jobs without disposal

### Requirement: Optional subscription via Comlink.proxy
The worker API MAY expose `subscribe(onResult)` where `onResult` is passed with `Comlink.proxy`. Unsubscribe or `dispose` MUST stop further callbacks for that session.

#### Scenario: Proxied callback receives results
- **WHEN** the consumer subscribes with a proxied callback and processes frames
- **THEN** the callback is invoked with `VideoProcessResult` values
- **WHEN** the consumer disposes the API
- **THEN** no further subscription callbacks are delivered for that session

### Requirement: `useVideoWorker` lifecycle hook
The library SHALL export `useVideoWorker` that manages worker creation and Comlink wrap/release with idle/loading/ready/error state. Unmount and stop MUST `releaseProxy` and `worker.terminate()`. A session/generation id MUST ignore late results after restart.

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
If a convenience bridge feeds `MediaStream` video frames into the worker, it MUST NOT call `getUserMedia` or `getDisplayMedia` and MUST NOT stop tracks on the provided stream by default when the bridge stops. Docs SHOULD steer continuous realtime track transforms to the track-processor strategy.

#### Scenario: Bridge stop leaves tracks running
- **WHEN** a stream-fed video worker bridge stops
- **THEN** tracks on the provided `MediaStream` remain in their prior `readyState`

### Requirement: ESM worker packaging and overrides
The package SHALL provide an ESM-consumable worker factory or URL. Consumers MUST be able to override worker creation for tests and bundlers. Default CJS `require` without an override MAY be unsupported and MUST be documented.

#### Scenario: Custom createWorker in tests
- **WHEN** the consumer supplies a `createWorker` override returning a Comlink-compatible endpoint
- **THEN** `useVideoWorker` can reach ready state without the production worker script

### Requirement: Parallel to audio-worker, not a replacement
The video worker capability SHALL be additive and MUST NOT remove or break the existing audio worker public contract. Video APIs SHALL be video-namespaced (`Video*` types / `useVideoWorker`) rather than overloading audio PCM types.

#### Scenario: Audio worker remains available
- **WHEN** a consumer depends on the existing audio worker exports after this change ships
- **THEN** those audio APIs remain importable and behaviorally compatible

#### Scenario: Video types are namespaced
- **WHEN** a consumer uses the video worker public surface
- **THEN** frame/options/result types are video-specific and distinct from `AudioFrame` / `AudioProcessResult`
