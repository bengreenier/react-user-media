## ADDED Requirements

### Requirement: Realtime frame path remains non-blocking for RPC
The track-rpc strategy SHALL use a `MediaStreamTrackProcessor` pipeline equivalent to the realtime track-processor strategy. Per-frame handling MUST occur on that realtime path. Comlink calls MUST NOT be awaited inside the per-frame transform hot path.

#### Scenario: Transform stays free of Comlink awaits under RPC
- **WHEN** track-rpc is running and Comlink configure/subscribe are in use
- **THEN** frames continue to be handled without awaiting Comlink inside the per-frame transform

### Requirement: Comlink on track-processor control port
The main thread SHALL obtain a typed control proxy via `Comlink.wrap` on a `MessagePort` (or an equivalent port endpoint documented by the library) associated with the track-processor session. The processor/control side SHALL `Comlink.expose` a control API on that port that includes at least `configure` and `dispose`. Optional `subscribe` SHALL accept callbacks via `Comlink.proxy`.

#### Scenario: Configure through Comlink proxy
- **WHEN** the consumer awaits `configure` on the track-rpc proxy with valid options
- **THEN** subsequent processing uses the configured options without constructing a Dedicated Worker for control

#### Scenario: Dispose stops RPC session
- **WHEN** the consumer awaits `dispose` on the control proxy
- **THEN** further configure/subscribe operations fail closed for that session and subscription callbacks stop

### Requirement: Shared result type for subscriptions
Subscription or polled results exposed through the Comlink control plane SHALL use the shared `VideoProcessResult` type (including width/height/timestamp for the default summary processor).

#### Scenario: Subscribe receives frame summaries
- **WHEN** the consumer subscribes with a proxied callback and video frames are flowing
- **THEN** the callback receives `VideoProcessResult` values with summary fields

### Requirement: React strategy surface
The library SHALL expose track-rpc through the stream-oriented processor hook via an explicit strategy (e.g. `strategy: "track-rpc"`) or an equivalently documented dedicated export. Lifecycle SHALL match the track-processor strategy: idle/loading/ready/error, session invalidation, no default track stop, teardown of pipeline and Comlink proxy on stop/unmount.

#### Scenario: Ready with track-rpc strategy
- **WHEN** the consumer starts the stream processor with track-rpc strategy and a valid stream
- **THEN** state becomes ready and both realtime processing and Comlink control are available

#### Scenario: Cleanup releases proxy and pipeline
- **WHEN** the component unmounts during an active track-rpc session
- **THEN** the Comlink proxy is released and the track-processor pipeline is torn down

#### Scenario: Does not stop capture tracks
- **WHEN** track-rpc stops or unmounts
- **THEN** tracks on the provided `MediaStream` remain in their prior `readyState`

### Requirement: Depends on track-processor packaging
Track-rpc SHALL reuse the same ESM packaging and override rules as the realtime track-processor capability. Comlink MUST be loaded for this strategy; track-processor-only consumers MUST remain able to use the non-rpc path without requiring Comlink if packaging splits allow.

#### Scenario: Override factory still works
- **WHEN** the consumer overrides processor/pipeline creation under track-rpc strategy
- **THEN** the hook can reach ready state using that override with Comlink control attached to the session port
