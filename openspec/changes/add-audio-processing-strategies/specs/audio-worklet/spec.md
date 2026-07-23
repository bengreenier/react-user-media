## ADDED Requirements

### Requirement: Realtime graph wiring
The library SHALL provide an AudioWorklet-based path that connects a consumer-supplied `MediaStream` into a Web Audio graph: `MediaStreamAudioSourceNode` → `AudioWorkletNode` → a non-audible sink or explicit destination as documented. The library MUST load the processor via `audioContext.audioWorklet.addModule` before constructing the node. This path MUST NOT call `getUserMedia` / `getDisplayMedia`.

#### Scenario: Graph connects for a live stream
- **WHEN** the consumer starts the worklet processor with a `MediaStream` that has an audio track
- **THEN** an `AudioWorkletNode` is created after successful `addModule` and the source is connected through that node

### Requirement: Synchronous process callback
Custom processors shipped by the library SHALL implement `AudioWorkletProcessor.process` as a synchronous, realtime-safe callback. `process` MUST NOT perform Comlink awaits or other asynchronous RPC. Returning `true` MUST keep the processor alive while the session is active.

#### Scenario: Process runs without async RPC
- **WHEN** audio quanta flow through the worklet node
- **THEN** `process` completes synchronously and continues to be invoked while the session remains active

### Requirement: Built-in level analysis
The default library worklet processor SHALL compute at least RMS and peak levels from input frames and expose them to the main thread as `AudioProcessResult` values (shared type family).

#### Scenario: Levels from live input
- **WHEN** the worklet processes a live stream with audible audio
- **THEN** the main-thread consumer eventually observes a non-null level result with RMS and peak fields

### Requirement: Throttled port metrics
Level or analysis results SHALL be delivered to the main thread via `MessagePort` at a throttled rate suitable for UI updates. The implementation MUST NOT require posting a full result on every audio quantum.

#### Scenario: Metrics arrive for UI
- **WHEN** the processor is running and producing levels
- **THEN** the main thread receives periodic `AudioProcessResult` messages without one mandatory message per quantum

### Requirement: React hook lifecycle
The library SHALL export a React hook for the worklet strategy that uses discriminated idle/loading/ready/error state. Start SHALL create/resume context and build the graph; stop and unmount SHALL disconnect nodes, release ports, and close or otherwise dispose the context as documented. A session/generation id MUST ignore late port messages after restart. Tracks on the provided `MediaStream` MUST NOT be stopped by default on stop/unmount.

#### Scenario: Ready after successful start
- **WHEN** the consumer starts the worklet hook with a valid stream and module URL
- **THEN** state becomes ready and level results can flow

#### Scenario: Cleanup on unmount
- **WHEN** the component unmounts while the worklet session is active
- **THEN** the graph is torn down and no further state updates are applied from that session

#### Scenario: Does not stop capture tracks
- **WHEN** the worklet hook stops or unmounts
- **THEN** tracks on the provided `MediaStream` remain in their prior `readyState`

#### Scenario: Module or context failure
- **WHEN** `addModule` or graph setup fails
- **THEN** state is error, ready is false, and resources from the failed attempt are not left owned by the hook

### Requirement: ESM module URL and overrides
The package SHALL provide an ESM-consumable URL or factory for the worklet processor module. Consumers MUST be able to override the module URL for tests and alternate bundlers. Default CJS `require` usage without an override MAY be unsupported and MUST be documented.

#### Scenario: Custom module URL in tests
- **WHEN** the consumer supplies a custom worklet module URL compatible with `addModule`
- **THEN** the hook can reach ready state using that module
