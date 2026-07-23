import { useEffect, useState } from "react";
import type { AudioWorkletRpcApi } from "./controller";
import {
  type AudioWorkletRpcSessionOptions,
  createAudioWorkletRpcSession,
} from "./index";

const defaultOptions: AudioWorkletRpcSessionOptions = {};

export type AudioWorkletRpcState =
  | { status: "idle" | "loading"; api?: undefined; error?: undefined }
  | { status: "ready"; api: AudioWorkletRpcApi; error?: undefined }
  | { status: "error"; api?: undefined; error: Error };

/**
 * React lifecycle wrapper for the AudioWorklet + Comlink control strategy.
 * It never stops tracks owned by the supplied MediaStream.
 */
export function useMediaAudioWorkletRpc(
  stream: MediaStream | null | undefined,
  options: AudioWorkletRpcSessionOptions = defaultOptions,
): AudioWorkletRpcState {
  const [state, setState] = useState<AudioWorkletRpcState>({
    status: "idle",
  });

  useEffect(() => {
    if (!stream) {
      setState({ status: "idle" });
      return;
    }

    let active = true;
    let session: Awaited<ReturnType<typeof createAudioWorkletRpcSession>>;
    setState({ status: "loading" });

    void createAudioWorkletRpcSession(stream, options)
      .then((createdSession) => {
        if (!active) {
          return createdSession.dispose();
        }
        session = createdSession;
        setState({ status: "ready", api: createdSession.api });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });

    return () => {
      active = false;
      void session?.dispose();
    };
  }, [stream, options]);

  return state;
}
