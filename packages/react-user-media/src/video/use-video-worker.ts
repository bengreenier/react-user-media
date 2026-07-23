import * as Comlink from "comlink";
import { useCallback, useEffect, useRef, useState } from "react";
import { createVideoWorker } from "../root-workers";
import type { VideoProcessOptions, VideoWorkerApi } from "./types";

export type VideoWorkerProxy = Comlink.Remote<VideoWorkerApi>;

export interface UseVideoWorkerOptions {
  createWorker?: () => Worker;
  processOptions?: VideoProcessOptions;
}

interface VideoWorkerStateBase {
  api: VideoWorkerProxy | null;
  error: Error | null;
  isError: boolean;
  isIdle: boolean;
  isLoading: boolean;
  isReady: boolean;
  start(): void;
  stop(): void;
}

interface VideoWorkerIdleState extends VideoWorkerStateBase {
  api: null;
  error: null;
  isError: false;
  isIdle: true;
  isLoading: false;
  isReady: false;
}

interface VideoWorkerLoadingState extends VideoWorkerStateBase {
  api: null;
  error: null;
  isError: false;
  isIdle: false;
  isLoading: true;
  isReady: false;
}

interface VideoWorkerReadyState extends VideoWorkerStateBase {
  api: VideoWorkerProxy;
  error: null;
  isError: false;
  isIdle: false;
  isLoading: false;
  isReady: true;
}

interface VideoWorkerErrorState extends VideoWorkerStateBase {
  api: null;
  error: Error;
  isError: true;
  isIdle: false;
  isLoading: false;
  isReady: false;
}

export type VideoWorkerState =
  | VideoWorkerIdleState
  | VideoWorkerLoadingState
  | VideoWorkerReadyState
  | VideoWorkerErrorState;

const idleState = {
  api: null,
  error: null,
  isError: false,
  isIdle: true,
  isLoading: false,
  isReady: false,
} as const;

/**
 * Manages a video-job worker and its Comlink proxy.
 *
 * This hook does not acquire media or stop tracks. Use it for asynchronous
 * frame/WebCodecs jobs; use the track-processor strategy for live streams.
 */
export function useVideoWorker(
  options: UseVideoWorkerOptions = {},
): VideoWorkerState {
  const workerRef = useRef<Worker | null>(null);
  const proxyRef = useRef<VideoWorkerProxy | null>(null);
  const sessionIdRef = useRef(0);
  const [state, setState] =
    useState<Omit<VideoWorkerState, "start" | "stop">>(idleState);

  const releaseCurrentWorker = useCallback(function releaseCurrentWorker() {
    sessionIdRef.current += 1;

    const proxy = proxyRef.current;
    proxyRef.current = null;
    if (proxy) {
      void proxy.dispose().catch(() => undefined);
      proxy[Comlink.releaseProxy]();
    }

    const worker = workerRef.current;
    workerRef.current = null;
    worker?.terminate();
  }, []);

  const stop = useCallback(
    function stopVideoWorker() {
      releaseCurrentWorker();
      setState(idleState);
    },
    [releaseCurrentWorker],
  );

  const start = useCallback(
    function startVideoWorker() {
      releaseCurrentWorker();
      const sessionId = sessionIdRef.current;
      setState({
        api: null,
        error: null,
        isError: false,
        isIdle: false,
        isLoading: true,
        isReady: false,
      });

      let worker: Worker;
      let proxy: VideoWorkerProxy;
      try {
        worker = (options.createWorker ?? createVideoWorker)();
        proxy = Comlink.wrap<VideoWorkerApi>(worker);
      } catch (error) {
        if (sessionIdRef.current === sessionId) {
          setState({
            api: null,
            error: toError(error),
            isError: true,
            isIdle: false,
            isLoading: false,
            isReady: false,
          });
        }
        return;
      }

      workerRef.current = worker;
      proxyRef.current = proxy;

      void proxy
        .configure(options.processOptions ?? { mode: "summary" })
        .then(() => {
          if (sessionIdRef.current !== sessionId) {
            return;
          }

          setState({
            api: proxy,
            error: null,
            isError: false,
            isIdle: false,
            isLoading: false,
            isReady: true,
          });
        })
        .catch((error: unknown) => {
          if (sessionIdRef.current !== sessionId) {
            return;
          }

          releaseCurrentWorker();
          setState({
            api: null,
            error: toError(error),
            isError: true,
            isIdle: false,
            isLoading: false,
            isReady: false,
          });
        });
    },
    [options.createWorker, options.processOptions, releaseCurrentWorker],
  );

  useEffect(
    function cleanupVideoWorkerOnUnmount() {
      return releaseCurrentWorker;
    },
    [releaseCurrentWorker],
  );

  return {
    ...state,
    start,
    stop,
  } as VideoWorkerState;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
