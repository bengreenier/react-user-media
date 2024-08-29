import {
  useMedia,
  useMediaRecorder,
  useMediaTracks,
  VideoPlayer,
} from "@bengreenier/react-user-media";

export function WebcamPreview() {
  const { request, isError, error, isLoading, isReady, media } =
    useMedia("user");
  const {
    startRecording,
    stopRecording,
    isError: hasRecordingError,
    error: recordingError,
    isRecording,
    isFinalized,
    segments,
    startTime,
    endTime,
  } = useMediaRecorder();

  const tracks = useMediaTracks(media);

  return (
    <div>
      {isError && (
        <p>
          {error.message}
          <small>{error.stack}</small>
        </p>
      )}
      {isLoading && <p>Loading...</p>}
      {!isReady && (
        <button onClick={() => request({ video: true, audio: true })}>
          Request User Media
        </button>
      )}
      {isReady && (
        <>
          <VideoPlayer autoPlay media={media} />
          <ul>
            {tracks.map((track) => (
              <li key={track.id}>
                {track.kind} {track.label} {track.id}{" "}
                {track.muted ? "muted" : "unmuted"}
              </li>
            ))}
          </ul>
          {hasRecordingError && (
            <p>
              {recordingError.message}
              <small>{recordingError.stack}</small>
            </p>
          )}
          <button
            disabled={isRecording}
            onClick={() => {
              startRecording(media, { timeslice: 50 });
            }}
          >
            Start Recording
          </button>
          <button
            disabled={!isRecording}
            onClick={() => {
              stopRecording();
            }}
          >
            Stop Recording
          </button>
          {(isRecording || isFinalized) && (
            <p>Started recording at {startTime}</p>
          )}
          {isFinalized && (
            <p>
              Stopped recording at {endTime} ({segments.length} segments)
            </p>
          )}
        </>
      )}
    </div>
  );
}
