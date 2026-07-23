/**
 * Copy-paste demo for track-rpc configure/subscribe.
 * Import from `@bengreenier/react-user-media/video-track-rpc`.
 */
import { useEffect, useState } from "react";
import { useMediaVideoTrackRpc } from "./hook";

export function VideoTrackRpcExample({ media }: { media: MediaStream }) {
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState("idle");
  const rpc = useMediaVideoTrackRpc(enabled ? media : null, {
    onResult: (result) => {
      setLabel(`${result.width}x${result.height}`);
    },
    processOptions: { metricIntervalMs: 100 },
  });

  useEffect(() => {
    if (rpc.status === "ready") {
      void rpc.api.configure({ metricIntervalMs: 50 });
    }
  }, [rpc]);

  return (
    <section>
      <button type="button" onClick={() => setEnabled((value) => !value)}>
        {enabled ? "Stop track-rpc" : "Start track-rpc"}
      </button>
      <p>{rpc.status}</p>
      <p>{label}</p>
      {rpc.status === "error" && <p>{rpc.error.message}</p>}
    </section>
  );
}
