## ADDED Requirements

### Requirement: VideoPlayer binds MediaProvider to a video element
`VideoPlayer` SHALL render an `HTMLVideoElement`, accept a required `media: MediaProvider` prop, and assign that value to the element's `srcObject`. `VideoPlayerProps` SHALL extend video element attributes while omitting `src` and `srcObject`. The component SHALL be a `forwardRef` wrapper that exposes the underlying video element.

#### Scenario: Plays back user media video
- **WHEN** `useMedia("user")` becomes ready with a video stream and `VideoPlayer` is rendered with that `media` and `autoPlay`
- **THEN** the video element SHALL report playback (`played.length` greater than zero)

#### Scenario: Assigns media to srcObject on mount
- **WHEN** `VideoPlayer` mounts with a `MediaStream` as `media`
- **THEN** the rendered `<video>` element's `srcObject` SHALL be that stream

### Requirement: AudioPlayer binds MediaProvider to an audio element
`AudioPlayer` SHALL render an `HTMLAudioElement`, accept a required `media: MediaProvider` prop, and assign that value to the element's `srcObject`. `AudioPlayerProps` SHALL extend audio element attributes while omitting `src` and `srcObject`. The component SHALL be a `forwardRef` wrapper that exposes the underlying audio element.

#### Scenario: Plays back user media audio
- **WHEN** `useMedia("user")` becomes ready with an audio stream and `AudioPlayer` is rendered with that `media` and `autoPlay`
- **THEN** the audio element SHALL report playback (`played.length` greater than zero)

#### Scenario: Assigns media to srcObject on mount
- **WHEN** `AudioPlayer` mounts with a `MediaStream` as `media`
- **THEN** the rendered `<audio>` element's `srcObject` SHALL be that stream

### Requirement: Players clear srcObject on unmount
When a player unmounts, it SHALL set the previously attached media element's `srcObject` to `null`.

#### Scenario: VideoPlayer clears srcObject on unmount
- **WHEN** `VideoPlayer` has attached a stream to a video element and the component unmounts
- **THEN** that video element's `srcObject` SHALL be `null`

#### Scenario: AudioPlayer clears srcObject on unmount
- **WHEN** `AudioPlayer` has attached a stream to an audio element and the component unmounts
- **THEN** that audio element's `srcObject` SHALL be `null`

### Requirement: Players clear srcObject when the DOM element is replaced
When the host ref callback receives a different media element than the one currently tracked, the player SHALL set the previous element's `srcObject` to `null` and assign `media` to the new element's `srcObject`.

#### Scenario: VideoPlayer clears previous element on replace
- **WHEN** `VideoPlayer`'s ref callback is invoked with a new `HTMLVideoElement` while a previous video element still holds the stream
- **THEN** the previous element's `srcObject` SHALL be `null` and the new element's `srcObject` SHALL be the current `media`

#### Scenario: AudioPlayer clears previous element on replace
- **WHEN** `AudioPlayer`'s ref callback is invoked with a new `HTMLAudioElement` while a previous audio element still holds the stream
- **THEN** the previous element's `srcObject` SHALL be `null` and the new element's `srcObject` SHALL be the current `media`

### Requirement: Players update srcObject when media changes
When the `media` prop changes, the player SHALL assign the new `MediaProvider` to the current element's `srcObject`.

#### Scenario: VideoPlayer updates srcObject on media prop change
- **WHEN** `VideoPlayer` is re-rendered with a different `media` value
- **THEN** the video element's `srcObject` SHALL equal the new `media`

#### Scenario: AudioPlayer updates srcObject on media prop change
- **WHEN** `AudioPlayer` is re-rendered with a different `media` value
- **THEN** the audio element's `srcObject` SHALL equal the new `media`

### Requirement: Players forward non-media-source attributes
Players SHALL forward remaining HTML media attributes (and other allowed props) to the underlying element, and MUST NOT accept consumer-supplied `src` or `srcObject` (those are omitted from the public props type and driven only via `media`).

#### Scenario: VideoPlayer forwards attributes
- **WHEN** `VideoPlayer` is rendered with attributes such as `autoPlay` or `data-testid`
- **THEN** those attributes SHALL be present on the rendered `<video>` element

#### Scenario: AudioPlayer forwards attributes
- **WHEN** `AudioPlayer` is rendered with attributes such as `autoPlay` or `data-testid`
- **THEN** those attributes SHALL be present on the rendered `<audio>` element
