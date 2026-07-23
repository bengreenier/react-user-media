import { useMediaAudioProcessor } from "@bengreenier/react-user-media";

const workletModuleUrl = new URL(
  "../../react-user-media/src/audio-worklet/level-meter.ts",
  import.meta.url,
);

export function AudioLevelMeter({ media }: { media: MediaStream }) {
  const processor = useMediaAudioProcessor({
    strategy: "worklet",
    workletModuleUrl,
  });

  return (
    <section>
      <h2>Live audio level</h2>
      {!processor.isReady && (
        <button onClick={() => processor.start(media)}>
          Start level meter
        </button>
      )}
      {processor.isLoading && <p>Starting meter...</p>}
      {processor.isError && <p>{processor.error.message}</p>}
      {processor.isReady && (
        <>
          <p>RMS: {processor.result?.rms.toFixed(3) ?? "0.000"}</p>
          <p>Peak: {processor.result?.peak.toFixed(3) ?? "0.000"}</p>
          <button onClick={processor.stop}>Stop level meter</button>
        </>
      )}
    </section>
  );
}
