import { useMemo, useState } from "react";
import { type AudioProcessResult, useMediaAudioWorkletRpc } from "./index";

/**
 * Copy into an application after supplying a microphone MediaStream.
 * The module URL override is useful when the package's ESM asset URL cannot be
 * resolved by the consuming bundler.
 */
export function AudioWorkletRpcDemo({
  stream,
  workletModuleUrl,
}: {
  stream: MediaStream | null;
  workletModuleUrl?: URL | string;
}) {
  const [result, setResult] = useState<AudioProcessResult>();
  const options = useMemo(
    () => ({ onResult: setResult, workletModuleUrl }),
    [workletModuleUrl],
  );
  const state = useMediaAudioWorkletRpc(stream, options);

  return (
    <output>
      {state.status === "ready" && result
        ? `RMS ${result.rms.toFixed(3)}, peak ${result.peak.toFixed(3)}`
        : state.status}
    </output>
  );
}
