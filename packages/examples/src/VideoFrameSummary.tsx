import { useMediaVideoProcessor } from "@bengreenier/react-user-media";

export function VideoFrameSummary({ media }: { media: MediaStream }) {
  const processor = useMediaVideoProcessor({
    strategy: "track",
  });

  return (
    <section>
      <h2>Live video frame summary</h2>
      {!processor.isReady && (
        <button type="button" onClick={() => processor.start(media)}>
          Start frame summary
        </button>
      )}
      {processor.isLoading && <p>Starting summary...</p>}
      {processor.isError && <p>{processor.error.message}</p>}
      {processor.isReady && (
        <>
          <p>
            {processor.result
              ? `${processor.result.width}x${processor.result.height} @ ${processor.result.timestamp}`
              : "Waiting for frames..."}
          </p>
          <button type="button" onClick={processor.stop}>
            Stop frame summary
          </button>
        </>
      )}
    </section>
  );
}
