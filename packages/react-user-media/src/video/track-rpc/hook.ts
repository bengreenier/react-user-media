import { useEffect, useRef, useState } from "react";
import type { VideoTrackRpcApi } from "./controller";
import {
  createVideoTrackRpcSession,
  type VideoTrackRpcSession,
  type VideoTrackRpcSessionOptions,
} from "./session";

export type VideoTrackRpcState =
  | { status: "idle"; api: null; error: null }
  | { status: "loading"; api: null; error: null }
  | { status: "ready"; api: VideoTrackRpcApi; error: null }
  | { status: "error"; api: null; error: Error };

/**
 * Creates a track-rpc session for the provided MediaStream. Pass `null` to
 * dispose. Does not stop caller-owned tracks.
 */
export function useMediaVideoTrackRpc(
  stream: MediaStream | null,
  options: VideoTrackRpcSessionOptions = {},
): VideoTrackRpcState {
  const [state, setState] = useState<VideoTrackRpcState>({
    status: "idle",
    api: null,
    error: null,
  });
  const sessionRef = useRef<VideoTrackRpcSession | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (sessionRef.current) {
        await sessionRef.current.dispose().catch(() => undefined);
        sessionRef.current = null;
      }

      if (!stream) {
        setState({ status: "idle", api: null, error: null });
        return;
      }

      setState({ status: "loading", api: null, error: null });
      try {
        const session = await createVideoTrackRpcSession(
          stream,
          optionsRef.current,
        );
        if (cancelled) {
          await session.dispose();
          return;
        }
        sessionRef.current = session;
        setState({ status: "ready", api: session.api, error: null });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            api: null,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
      const session = sessionRef.current;
      sessionRef.current = null;
      void session?.dispose().catch(() => undefined);
    };
  }, [stream]);

  return state;
}
