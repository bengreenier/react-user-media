import * as Comlink from "comlink";
import { useCallback, useEffect, useRef, useState } from "react";
import { createAudioWorker } from "../root-workers";
import type { AudioProcessOptions, AudioWorkerApi } from "./types";

export type AudioWorkerProxy = Comlink.Remote<AudioWorkerApi>;

export interface UseAudioWorkerOptions {
  createWorker?: () => Worker;
  processOptions?: AudioProcessOptions;
}

interface AudioWorkerStateBase {
  api: AudioWorkerProxy | null;
  error: Error | null;
  isError: boolean;
  isIdle: boolean;
  isLoading: boolean;
  isReady: boolean;
  start(): void;
  stop(): void;
}

interface AudioWorkerIdleState extends AudioWorkerStateBase {
  api: null;
  error: null;
  isError: false;
  isIdle: true;
  isLoading: false;
  isReady: false;
}

interface AudioWorkerLoadingState extends AudioWorkerStateBase {
  api: null;
  error: null;
  isError: false;
  isIdle: false;
  isLoading: true;
  isReady: false;
}

interface AudioWorkerReadyState extends AudioWorkerStateBase {
  api: AudioWorkerProxy;
  error: null;
  isError: false;
  isIdle: false;
  isLoading: false;
  isReady: true;
}

interface AudioWorkerErrorState extends AudioWorkerStateBase {
  api: null;
  error: Error;
  isError: true;
  isIdle: false;
  isLoading: false;
  isReady: false;
}

export type AudioWorkerState =
  | AudioWorkerIdleState
  | AudioWorkerLoadingState
  | AudioWorkerReadyState
  | AudioWorkerErrorState;

const idleState = {
  api: null,
  error: null,
  isError: false,
  isIdle: true,
  isLoading: false,
  isReady: false,
} as const;

/**
 * Manages an audio-job worker and its Comlink proxy.
 *
 * This hook does not acquire media or stop tracks. Use it for asynchronous
 * buffer jobs; use an AudioWorklet for live stream DSP.
 */
export function useAudioWorker(
  options: UseAudioWorkerOptions = {},
): AudioWorkerState {
  const workerRef = useRef<Worker | null>(null);
  const proxyRef = useRef<AudioWorkerProxy | null>(null);
  const sessionIdRef = useRef(0);
  const [state, setState] =
    useState<Omit<AudioWorkerState, "start" | "stop">>(idleState);

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
    function stopAudioWorker() {
      releaseCurrentWorker();
      setState(idleState);
    },
    [releaseCurrentWorker],
  );

  const start = useCallback(
    function startAudioWorker() {
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
      let proxy: AudioWorkerProxy;
      try {
        worker = (options.createWorker ?? createAudioWorker)();
        proxy = Comlink.wrap<AudioWorkerApi>(worker);
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
        .configure(options.processOptions ?? { sampleRate: 48_000 })
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
    function cleanupAudioWorkerOnUnmount() {
      return releaseCurrentWorker;
    },
    [releaseCurrentWorker],
  );

  return {
    ...state,
    start,
    stop,
  } as AudioWorkerState;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
