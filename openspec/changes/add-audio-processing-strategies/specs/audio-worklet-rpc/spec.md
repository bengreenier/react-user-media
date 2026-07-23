## ADDED Requirements

### Requirement: Realtime DSP remains in process
The worklet-rpc strategy SHALL use an AudioWorklet graph equivalent to the realtime worklet strategy. Audio sample processing MUST occur in synchronous `AudioWorkletProcessor.process`. Comlink calls MUST NOT be awaited inside `process`.

#### Scenario: Process stays synchronous under RPC
- **WHEN** worklet-rpc is running and Comlink configure/subscribe are in use
- **THEN** audio quanta continue to be handled by synchronous `process` without awaiting Comlink

### Requirement: Comlink on AudioWorkletNode port
The main thread SHALL obtain a typed control proxy via `Comlink.wrap` on the `AudioWorkletNode`’s `MessagePort` (or an equivalent port endpoint documented by the library). The worklet side SHALL `Comlink.expose` a control API on that port that includes at least `configure` and `dispose`. Optional `subscribe` SHALL accept callbacks via `Comlink.proxy`.

#### Scenario: Configure through Comlink proxy
- **WHEN** the consumer awaits `configure` on the worklet-rpc proxy with valid options
- **THEN** subsequent processing uses the configured options without rebuilding a Dedicated Worker

#### Scenario: Dispose stops RPC session
- **WHEN** the consumer awaits `dispose` on the control proxy
- **THEN** further configure/subscribe operations fail closed for that session and subscription callbacks stop

### Requirement: Shared result type for subscriptions
Subscription or polled results exposed through the Comlink control plane SHALL use the shared `AudioProcessResult` type (including RMS/peak for the default level processor).

#### Scenario: Subscribe receives levels
- **WHEN** the consumer subscribes with a proxied callback and audio is flowing
- **THEN** the callback receives `AudioProcessResult` values with level fields

### Requirement: React strategy surface
The library SHALL expose worklet-rpc through the stream-oriented processor hook via an explicit strategy (e.g. `strategy: "worklet-rpc"`) or an equivalently documented dedicated export. Lifecycle SHALL match the worklet strategy: idle/loading/ready/error, session invalidation, no default track stop, teardown of graph and Comlink proxy on stop/unmount.

#### Scenario: Ready with worklet-rpc strategy
- **WHEN** the consumer starts the stream processor with worklet-rpc strategy and a valid stream
- **THEN** state becomes ready and both realtime processing and Comlink control are available

#### Scenario: Cleanup releases proxy and graph
- **WHEN** the component unmounts during an active worklet-rpc session
- **THEN** the Comlink proxy is released and the audio graph is torn down

#### Scenario: Does not stop capture tracks
- **WHEN** worklet-rpc stops or unmounts
- **THEN** tracks on the provided `MediaStream` remain in their prior `readyState`

### Requirement: Depends on worklet module packaging
Worklet-rpc SHALL reuse the same ESM worklet module packaging rules as the realtime worklet capability (URL/factory + overrides). Comlink MUST be loaded for this strategy; worklet-only consumers MUST remain able to use the non-rpc worklet path without requiring Comlink if packaging splits allow.

#### Scenario: Override module URL still works
- **WHEN** the consumer overrides the worklet module URL under worklet-rpc strategy
- **THEN** the hook can reach ready state using that module with Comlink control attached to the node port
