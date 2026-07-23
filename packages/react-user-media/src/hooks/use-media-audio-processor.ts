import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AudioProcessorState,
  AudioProcessResult,
  MediaAudioProcessorOptions,
} from "../audio";
import { getLevelMeterWorkletModuleUrl } from "../audio-worklet";
import type { ShallowShapeOf } from "../types";

interface WorkletGraph {
  readonly context: AudioContext;
  readonly source: MediaStreamAudioSourceNode;
  readonly processor: AudioWorkletNode;
  readonly silentGain: GainNode;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function disposeGraph(graph: WorkletGraph | undefined) {
  if (!graph) {
    return;
  }

  graph.processor.port.onmessage = null;
  graph.processor.port.close();
  graph.source.disconnect();
  graph.processor.disconnect();
  graph.silentGain.disconnect();
  void graph.context.close();
}

/**
 * Connects an existing MediaStream to the built-in, realtime AudioWorklet
 * level meter. It never obtains media or stops caller-owned stream tracks.
 */
export function useMediaAudioProcessor(
  options: MediaAudioProcessorOptions,
): AudioProcessorState {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<AudioProcessResult | null>(null);
  const sessionId = useRef(0);
  const graphRef = useRef<WorkletGraph | undefined>(undefined);

  const stop = useCallback(function stopAudioProcessor() {
    sessionId.current += 1;
    disposeGraph(graphRef.current);
    graphRef.current = undefined;
    setIsLoading(false);
    setIsReady(false);
    setError(null);
    setResult(null);
  }, []);

  const start = useCallback(
    function startAudioProcessor(media: MediaStream) {
      const currentSessionId = sessionId.current + 1;
      sessionId.current = currentSessionId;
      disposeGraph(graphRef.current);
      graphRef.current = undefined;
      setIsLoading(true);
      setIsReady(false);
      setError(null);
      setResult(null);

      void (async () => {
        let graph: WorkletGraph | undefined;
        let context: AudioContext | undefined;

        try {
          context = options.createAudioContext?.() ?? new AudioContext();
          const moduleUrl =
            options.workletModuleUrl ?? getLevelMeterWorkletModuleUrl();
          await context.audioWorklet.addModule(moduleUrl);
          await context.resume();

          const source = context.createMediaStreamSource(media);
          const processor = new AudioWorkletNode(
            context,
            "react-user-media-level-meter",
          );
          const silentGain = context.createGain();
          silentGain.gain.value = 0;
          source.connect(processor);
          processor.connect(silentGain);
          silentGain.connect(context.destination);

          graph = { context, source, processor, silentGain };
          processor.port.onmessage = (
            event: MessageEvent<AudioProcessResult>,
          ) => {
            if (sessionId.current === currentSessionId) {
              setResult(event.data);
            }
          };

          if (sessionId.current !== currentSessionId) {
            disposeGraph(graph);
            return;
          }

          graphRef.current = graph;
          setIsReady(true);
        } catch (cause) {
          disposeGraph(graph);
          if (!graph) {
            void context?.close();
          }
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
    [options],
  );

  useEffect(function disposeAudioProcessorOnUnmount() {
    return function teardownAudioProcessor() {
      sessionId.current += 1;
      disposeGraph(graphRef.current);
      graphRef.current = undefined;
    };
  }, []);

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
      }) satisfies ShallowShapeOf<AudioProcessorState>,
    [error, isLoading, isReady, result, start, stop],
  );

  return state as AudioProcessorState;
}
