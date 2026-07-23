## ADDED Requirements

### Requirement: Realtime track processor wiring
The library SHALL provide a `MediaStreamTrackProcessor`-based path that consumes video frames from a consumer-supplied `MediaStream` video track. The path MUST wire a processor into a transform pipeline (and MAY optionally produce an output track via `MediaStreamTrackGenerator` or an equivalent documented sink). The library MUST fail closed with a clear error when `MediaStreamTrackProcessor` is unavailable. This path MUST NOT call `getUserMedia` / `getDisplayMedia`.

#### Scenario: Pipeline connects for a live video track
- **WHEN** the consumer starts the track processor with a `MediaStream` that has a live video track and the API is available
- **THEN** a `MediaStreamTrackProcessor` is created for that track and frames begin flowing through the transform pipeline

#### Scenario: Missing MediaStreamTrackProcessor capability
- **WHEN** `MediaStreamTrackProcessor` is unavailable in the environment
- **THEN** starting the track-processor strategy MUST enter error state with a clear message
- **AND** MUST NOT throw to the caller from the start action

### Requirement: Frame close discipline on the realtime path
Custom transforms shipped by the library SHALL close `VideoFrame`s they do not output (and close intermediates they create) so frames are not retained across ticks. The transform hot path MUST NOT await Comlink or other RPC.

#### Scenario: Frames are closed when not forwarded
- **WHEN** the default metrics/passthrough transform processes an input frame it will not keep
- **THEN** that input frame is closed by the time the transform callback completes for that frame

#### Scenario: Transform runs without async RPC
- **WHEN** video frames flow through the track-processor pipeline
- **THEN** the per-frame transform completes without awaiting Comlink

### Requirement: Built-in frame summary metrics
The default library track-processor transform SHALL compute at least width, height, and timestamp summary fields from input frames and expose them to the main thread as `VideoProcessResult` values (shared type family).

#### Scenario: Metrics from live input
- **WHEN** the track processor processes a live stream with video frames
- **THEN** the main-thread consumer eventually observes a non-null result with width, height, and timestamp fields

### Requirement: Throttled metrics delivery
Frame summary results SHALL be delivered to the main thread at a throttled rate suitable for UI updates. The implementation MUST NOT require posting a full result on every frame.

#### Scenario: Metrics arrive for UI
- **WHEN** the processor is running and producing summaries
- **THEN** the main thread receives periodic `VideoProcessResult` messages without one mandatory message per frame

### Requirement: React hook lifecycle
The library SHALL export a React hook for the track-processor strategy that uses discriminated idle/loading/ready/error state. Start SHALL build the processor/transform pipeline; stop and unmount SHALL abort/cancel the pipeline, release ports, and close outstanding frames as documented. A session/generation id MUST ignore late messages after restart. Tracks on the provided `MediaStream` MUST NOT be stopped by default on stop/unmount.

#### Scenario: Ready after successful start
- **WHEN** the consumer starts the track-processor hook with a valid stream
- **THEN** state becomes ready and summary results can flow

#### Scenario: Cleanup on unmount
- **WHEN** the component unmounts while the track-processor session is active
- **THEN** the pipeline is torn down and no further state updates are applied from that session

#### Scenario: Does not stop capture tracks
- **WHEN** the track-processor hook stops or unmounts
- **THEN** tracks on the provided `MediaStream` remain in their prior `readyState`

#### Scenario: Pipeline setup failure
- **WHEN** processor or transform setup fails
- **THEN** state is error, ready is false, and resources from the failed attempt are not left owned by the hook

### Requirement: ESM packaging and overrides
The package SHALL provide ESM-consumable modules/factories for the track-processor path. Consumers MUST be able to override creation hooks or module URLs for tests and alternate bundlers. Default CJS `require` usage without an override MAY be unsupported and MUST be documented.

#### Scenario: Custom factory in tests
- **WHEN** the consumer supplies a test override for processor/pipeline creation
- **THEN** the hook can reach ready state without the production browser pipeline implementation
