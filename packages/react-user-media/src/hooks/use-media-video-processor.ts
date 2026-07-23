import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ShallowShapeOf } from "../types";
import type {
  MediaVideoProcessorOptions,
  VideoProcessorState,
  VideoProcessResult,
  VideoTrackPipeline,
} from "../video";
import {
  createSummaryTrackPipeline,
  isMediaStreamTrackProcessorSupported,
} from "../video-track-processor";

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function pickVideoTrack(media: MediaStream): MediaStreamTrack | undefined {
  return media.getVideoTracks()[0];
}

/**
 * Connects an existing MediaStream video track to the built-in realtime
 * MediaStreamTrackProcessor summary pipeline. It never obtains media or stops
 * caller-owned stream tracks.
 */
export function useMediaVideoProcessor(
  options: MediaVideoProcessorOptions,
): VideoProcessorState {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<VideoProcessResult | null>(null);
  const sessionId = useRef(0);
  const pipelineRef = useRef<VideoTrackPipeline | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);

  const disposePipeline = useCallback(function disposeVideoPipeline() {
    abortRef.current?.abort();
    abortRef.current = undefined;
    pipelineRef.current?.stop();
    pipelineRef.current = undefined;
  }, []);

  const stop = useCallback(
    function stopVideoProcessor() {
      sessionId.current += 1;
      disposePipeline();
      setIsLoading(false);
      setIsReady(false);
      setError(null);
      setResult(null);
    },
    [disposePipeline],
  );

  const start = useCallback(
    function startVideoProcessor(media: MediaStream) {
      const currentSessionId = sessionId.current + 1;
      sessionId.current = currentSessionId;
      disposePipeline();
      setIsLoading(true);
      setIsReady(false);
      setError(null);
      setResult(null);

      void (async () => {
        try {
          if (
            !options.createPipeline &&
            !isMediaStreamTrackProcessorSupported()
          ) {
            throw new Error("MediaStreamTrackProcessor is not available");
          }

          const track = pickVideoTrack(media);
          if (!track) {
            throw new Error("MediaStream has no video track");
          }

          const abort = new AbortController();
          abortRef.current = abort;
          const metricIntervalMs = options.metricIntervalMs ?? 1000 / 30;
          const onResult = (next: VideoProcessResult) => {
            if (sessionId.current === currentSessionId) {
              setResult(next);
            }
          };

          const pipeline = options.createPipeline
            ? await options.createPipeline(track, {
                metricIntervalMs,
                onResult,
                signal: abort.signal,
              })
            : await createSummaryTrackPipeline(track, {
                metricIntervalMs,
                onResult,
                signal: abort.signal,
              });

          if (sessionId.current !== currentSessionId) {
            pipeline.stop();
            abort.abort();
            return;
          }

          pipelineRef.current = pipeline;
          setIsReady(true);
        } catch (cause) {
          disposePipeline();
          if (sessionId.current === currentSessionId) {
            setError(toError(cause));
          }
        } finally {
          if (sessionId.current === currentSessionId) {
            setIsLoading(false);
          }
        }
      })();
    },
    [disposePipeline, options],
  );

  useEffect(
    function disposeVideoProcessorOnUnmount() {
      return function teardownVideoProcessor() {
        sessionId.current += 1;
        disposePipeline();
      };
    },
    [disposePipeline],
  );

  const state = useMemo(
    () =>
      ({
        isLoading,
        isReady,
        isError: error !== null,
        error,
        result,
        start,
        stop,
      }) satisfies ShallowShapeOf<VideoProcessorState>,
    [error, isLoading, isReady, result, start, stop],
  );

  return state as VideoProcessorState;
}
