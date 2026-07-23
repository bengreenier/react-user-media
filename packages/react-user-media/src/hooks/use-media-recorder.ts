import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ShallowShapeOf } from "../types";

/**
 * Options for configuring the recorder. Extends {@link MediaRecorderOptions}.
 */
export interface RecorderOptions extends MediaRecorderOptions {
  /**
   * The number of milliseconds to record into each `Blob`.
   *
   * If this parameter isn't included, the browser default behavior is used:
   * the entire media duration is recorded into a single `Blob` unless the
   * `requestData()` method is called to obtain the `Blob` and trigger the
   * creation of a new `Blob` into which the media continues to be recorded.
   */
  timeslice?: number;

  /**
   * A custom handler for the `dataavailable` event.
   *
   * Note: This is for advanced use-cases only. You probably don't need to modify the default handler.
   * @param ev - the event
   * @param callback - the callback that updates internal state
   *
   * @example
   * ```ts
   * function handleData(ev: BlobEvent, callback: (value: React.SetStateAction<Blob[]>) => void) {
   *    callback((current) => current.concat(ev.data));
   * }
   * ```
   */
  dataAvailableHandler?: (
    ev: BlobEvent,
    callback: (value: React.SetStateAction<Blob[]>) => void,
  ) => void;
}

/**
 * The base state of the recorder.
 */
interface RecorderStateBase {
  /**
   * Indicates that attempting to record the `media`.
   * caused an {@link Error}.
   *
   * See {@link error}.
   */
  isError: boolean;

  /**
   * Indicates that media is actively being recorded.
   *
   * See {@link startTime}.
   */
  isRecording: boolean;

  /**
   * Indicates that recording is currently paused.
   */
  isPaused: boolean;

  /**
   * Indicates that {@link segments} are ready for consumption.
   *
   * See {@link segments} and {@link endTime}.
   */
  isFinalized: boolean;

  /**
   * An error that occurred attempting to record the `media`.
   *
   * See {@link isError}.
   */
  error: Error | null;

  /**
   * The time at which the `media` began recording.
   *
   * See {@link isRecording}.
   */
  startTime: DOMHighResTimeStamp | null;

  /**
   * The time at which the `media` stopped recording.
   *
   * See {@link isFinalized}.
   */
  endTime: DOMHighResTimeStamp | null;

  /**
   * The segments of the recorded `media`.
   *
   * See {@link isRecording} and {@link isFinalized}.
   */
  segments: Blob[];

  /**
   * Starts recording `media` with this recorder.
   * @param media the media to record.
   * @param options the optional options for recording.
   */
  startRecording(media: MediaStream, options?: RecorderOptions): void;

  /**
   * Stops recording `media` with this recorder.
   */
  stopRecording(): void;

  /**
   * Pauses recording `media` with this recorder.
   */
  pauseRecording(): void;

  /**
   * Resumes recording `media` with this recorder.
   */
  resumeRecording(): void;
}

/**
 * The idle state of the recorder.
 */
interface RecorderIdleState extends RecorderStateBase {
  isError: false;
  isRecording: false;
  isPaused: false;
  isFinalized: false;
  error: null;
  startTime: null;
  endTime: null;
  segments: [];
}

/**
 * The error state of the recorder.
 */
interface RecorderErrorState extends RecorderStateBase {
  isError: true;
  isRecording: false;
  isPaused: false;
  isFinalized: false;
  error: Error;
  startTime: DOMHighResTimeStamp | null;
  endTime: DOMHighResTimeStamp | null;
  segments: Blob[];
}

/**
 * The recording state of the recorder.
 */
interface RecorderRecordingState extends RecorderStateBase {
  isError: false;
  isRecording: true;
  isPaused: false;
  isFinalized: false;
  error: null;
  startTime: DOMHighResTimeStamp;
  endTime: null;
  segments: Blob[];
}

/**
 * The paused state of the recorder.
 */
interface RecorderPausedState extends RecorderStateBase {
  isError: false;
  isRecording: false;
  isPaused: true;
  isFinalized: false;
  error: null;
  startTime: DOMHighResTimeStamp;
  endTime: null;
  segments: Blob[];
}

/**
 * The final state of the recorder.
 */
interface RecorderFinalizedState extends RecorderStateBase {
  isError: false;
  isRecording: false;
  isPaused: false;
  isFinalized: true;
  error: null;
  startTime: DOMHighResTimeStamp;
  endTime: DOMHighResTimeStamp;
  segments: Blob[];
}

/**
 * The state of the recorder.
 */
export type RecorderState =
  | RecorderIdleState
  | RecorderErrorState
  | RecorderRecordingState
  | RecorderPausedState
  | RecorderFinalizedState;

/**
 * Hook that facilitates recording {@link MediaStream} `media` with a {@link MediaRecorder}.
 * @returns See {@link RecorderState} for more information.
 */
export function useMediaRecorder(): RecorderState {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cleanupRecorderRef = useRef<(() => void) | null>(null);
  const sessionIdRef = useRef(0);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);

  const recorderState = useMediaRecorderState(recorder);

  const [error, setError] = useMediaRecorderError(recorder, sessionIdRef);
  const isError = error !== null;
  const isRecording = !isError && recorderState === "recording";
  const isPaused = !isError && recorderState === "paused";

  const [startTime, setStartTime] = useState<DOMHighResTimeStamp | null>(null);
  const [endTime, setEndTime] = useState<DOMHighResTimeStamp | null>(null);

  const [segments, setSegments] = useState<Blob[]>([]);
  const isFinalized =
    !isError && recorderState === "inactive" && endTime !== null;

  const cleanupCurrentRecorder = useCallback(function cleanupCurrentRecorder() {
    sessionIdRef.current += 1;

    cleanupRecorderRef.current?.();
    cleanupRecorderRef.current = null;
    recorderRef.current = null;
  }, []);

  const startRecording = useCallback(
    function startRecordingMedia(
      media: MediaStream,
      options?: RecorderOptions,
    ) {
      cleanupCurrentRecorder();

      const {
        timeslice,
        dataAvailableHandler = (
          ev: BlobEvent,
          callback: (value: React.SetStateAction<Blob[]>) => void,
        ) => {
          callback((current) => current.concat(ev.data));
        },
        ...recorderOptions
      } = options ?? {};

      let recorder: MediaRecorder;

      try {
        recorder = new MediaRecorder(media, recorderOptions);
      } catch (error) {
        setError(error instanceof Error ? error : new Error(String(error)));
        setSegments([]);
        setEndTime(null);
        setStartTime(null);
        setRecorder(null);
        return;
      }

      const sessionId = sessionIdRef.current;

      const onDataAvailable = function onDataAvailable(ev: BlobEvent) {
        if (sessionIdRef.current !== sessionId) {
          return;
        }

        dataAvailableHandler(ev, function setSegmentsForSession(value) {
          if (sessionIdRef.current !== sessionId) {
            return;
          }

          setSegments(value);
        });
      };

      recorder.addEventListener("dataavailable", onDataAvailable);

      cleanupRecorderRef.current = function cleanupRecorder() {
        recorder.removeEventListener("dataavailable", onDataAvailable);

        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      };

      setError(null);
      setSegments([]);
      setEndTime(null);

      const startTime = performance.now();

      try {
        if (timeslice === undefined) {
          recorder.start();
        } else {
          recorder.start(timeslice);
        }
      } catch (error) {
        cleanupRecorderRef.current?.();
        cleanupRecorderRef.current = null;
        recorderRef.current = null;
        setError(error instanceof Error ? error : new Error(String(error)));
        setSegments([]);
        setEndTime(null);
        setStartTime(null);
        setRecorder(null);
        return;
      }

      setStartTime(startTime);

      recorderRef.current = recorder;
      setRecorder(recorder);
    },
    [cleanupCurrentRecorder, setError],
  );

  const stopRecording = useCallback(function stopRecordingMedia() {
    const recorder = recorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      return;
    }

    const sessionId = sessionIdRef.current;
    const endTime = performance.now();

    recorder.addEventListener(
      "stop",
      function onStopCompleted() {
        if (sessionIdRef.current !== sessionId) {
          return;
        }

        setEndTime(endTime);
      },
      { once: true },
    );

    recorder.stop();
  }, []);

  const pauseRecording = useCallback(function pauseRecordingMedia() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.pause();
    }
  }, []);

  const resumeRecording = useCallback(function resumeRecordingMedia() {
    if (recorderRef.current?.state === "paused") {
      recorderRef.current.resume();
    }
  }, []);

  useEffect(
    function cleanupRecorderOnUnmount() {
      return cleanupCurrentRecorder;
    },
    [cleanupCurrentRecorder],
  );

  const state = {
    isError,
    isRecording,
    isPaused,
    isFinalized,
    error,
    segments,
    startTime,
    endTime,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } satisfies ShallowShapeOf<RecorderState>;

  // we cast, as it isn't worth the runtime cost to check that this
  // lines up with each condition.
  return state as RecorderState;
}

/**
 * Helper hook (internal only) that observes a {@link MediaRecorder.state}
 * @param recorder the {@link MediaRecorder} to observe.
 * @returns The `recorder` state.
 */
function useMediaRecorderState(recorder: MediaRecorder | null) {
  return useSyncExternalStore(
    useCallback(
      function subscribe(callback) {
        recorder?.addEventListener("start", callback);
        recorder?.addEventListener("stop", callback);
        recorder?.addEventListener("resume", callback);
        recorder?.addEventListener("pause", callback);

        return function unsubscribe() {
          recorder?.removeEventListener("start", callback);
          recorder?.removeEventListener("stop", callback);
          recorder?.removeEventListener("resume", callback);
          recorder?.removeEventListener("pause", callback);
        };
      },
      [recorder],
    ),
    useCallback(
      function getSnapshot() {
        return recorder?.state ?? "inactive";
      },
      [recorder],
    ),
  );
}

/**
 * Helper hook (internal only) that observes a {@link MediaRecorder} for error events.
 * @param recorder the {@link MediaRecorder} to observe.
 * @returns The `error`, if any.
 */
function useMediaRecorderError(
  recorder: MediaRecorder | null,
  sessionIdRef: React.MutableRefObject<number>,
) {
  const [errorState, setErrorState] = useState<{
    error: Error;
    sessionId: number;
  } | null>(null);

  const setError = useCallback(
    function setCurrentSessionError(error: Error | null) {
      if (error === null) {
        setErrorState(null);
        return;
      }

      setErrorState({ error, sessionId: sessionIdRef.current });
    },
    [sessionIdRef],
  );

  useEffect(
    function observeRecorderError() {
      const sessionId = sessionIdRef.current;
      let isCurrentSubscription = true;

      if (!recorder) {
        return function teardown() {
          isCurrentSubscription = false;
        };
      }

      // Clear prior error state only when observing a new recorder.
      // Failed starts may set an error while `recorder` remains null.
      setErrorState(null);

      const onError = (event: Event) => {
        if (!isCurrentSubscription || sessionIdRef.current !== sessionId) {
          return;
        }

        const eventError =
          "error" in event && event.error instanceof Error
            ? event.error
            : new Error(`MediaRecorder encountered an unknown error.`);

        setErrorState({
          error: eventError,
          sessionId,
        });
      };
      recorder.addEventListener("error", onError);

      return function teardown() {
        isCurrentSubscription = false;
        recorder.removeEventListener("error", onError);
      };
    },
    [recorder, sessionIdRef],
  );

  const error =
    errorState?.sessionId === sessionIdRef.current ? errorState.error : null;

  return [error, setError] as const;
}
