## ADDED Requirements

### Requirement: Observe all tracks on a MediaStream

`useMediaTracks` SHALL observe the tracks of a caller-provided `MediaStream | undefined` via `useSyncExternalStore`, subscribe to the stream's `addtrack` and `removetrack` events when a stream is present, and return the current `MediaStreamTrack[]` from `MediaStream.getTracks()` with referential stability when the set of track ids is unchanged.

#### Scenario: Tracks update when a track is removed

- **WHEN** a `MediaStream` with audio and video tracks is passed to `useMediaTracks` and a track is removed with a corresponding `removetrack` event
- **THEN** the hook return value SHALL update to the remaining tracks only

#### Scenario: Tracks update when a track is replaced at the same count

- **WHEN** a stream's only track is removed and a different track of the same kind is added, with corresponding `removetrack` and `addtrack` events
- **THEN** the hook return value SHALL contain the replacement track (not the original), even though the track count is unchanged

#### Scenario: Undefined media yields a stable empty array

- **WHEN** `useMediaTracks` is called with `undefined`, or the media argument becomes `undefined` after previously observing a stream
- **THEN** the hook SHALL return an empty array, and repeated snapshots with `undefined` media SHALL be referentially equal

#### Scenario: Empty MediaStream yields a frozen empty array

- **WHEN** `useMediaTracks` is called with a `MediaStream` that has no tracks
- **THEN** the hook SHALL return a frozen empty array

#### Scenario: Empty snapshot is shared and immutable

- **WHEN** a caller receives an empty track array from `useMediaTracks(undefined)` and attempts to mutate it
- **THEN** mutation SHALL fail (frozen array) and other hook instances SHALL continue to see an empty array

#### Scenario: Subscription follows the current media argument

- **WHEN** the media argument is replaced with a different `MediaStream` and the previous stream later emits `removetrack`
- **THEN** the hook SHALL continue reflecting only the current stream's tracks and SHALL ignore events from the previous stream

### Requirement: Observe audio tracks by kind

`useMediaAudioTracks` SHALL observe only tracks whose `kind` is `"audio"` on a caller-provided `MediaStream | undefined`, using the same subscription and snapshot-stability model as all-track observation.

#### Scenario: Audio snapshot stays stable when only video tracks change

- **WHEN** `useMediaAudioTracks` is observing a stream that already has an audio track and a video track is added with an `addtrack` event
- **THEN** the returned audio track array reference SHALL remain unchanged

### Requirement: Observe video tracks by kind

`useMediaVideoTracks` SHALL observe only tracks whose `kind` is `"video"` on a caller-provided `MediaStream | undefined`, using the same subscription and snapshot-stability model as all-track observation.

#### Scenario: Video snapshot stays stable when only audio tracks change

- **WHEN** `useMediaVideoTracks` is observing a stream that already has a video track and an audio track is added with an `addtrack` event
- **THEN** the returned video track array reference SHALL remain unchanged

### Requirement: Observe track mute state

`useTrackMuteState` SHALL observe a caller-provided `MediaStreamTrack` via `useSyncExternalStore`, subscribe to the track's `mute` and `unmute` events, and return `TrackMuteState` (`"muted" | "unmuted"`) derived from `track.muted`.

#### Scenario: Initial state matches track.muted

- **WHEN** `useTrackMuteState` is called with a track whose `muted` property is `true`
- **THEN** the hook SHALL return `"muted"`

#### Scenario: Mute and unmute events update state

- **WHEN** the observed track's `muted` property changes and the corresponding `mute` or `unmute` event is dispatched
- **THEN** the hook SHALL return `"muted"` or `"unmuted"` accordingly

#### Scenario: Subscription follows the current track argument

- **WHEN** the track argument is replaced with a different track and the previous track later emits `mute`
- **THEN** the hook SHALL ignore the previous track's event and SHALL update only when the current track emits mute/unmute

### Requirement: Observational ownership only

The media-tracks hooks SHALL NOT create, stop, or otherwise own `MediaStream` or `MediaStreamTrack` lifecycle; callers remain responsible for obtaining and releasing media.

#### Scenario: Hooks accept externally owned media

- **WHEN** a caller passes an existing `MediaStream` or `MediaStreamTrack` into these hooks
- **THEN** the hooks SHALL only subscribe and read snapshots; they SHALL NOT call `stop()` or release the stream as part of observation
