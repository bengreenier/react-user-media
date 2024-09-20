import {
  useState,
  useMemo,
  useCallback,
  useSyncExternalStore,
  useEffect,
  useRef,
} from "react";
import { ShallowShapeOf } from "../types";

/**
 * Options for configuring the recorder. Extends {@link MediaRecorderOptions}.
 */
export interface RecorderOptions extends MediaRecorderOptions {
  /**
   * The number of milliseconds to record into each `Blob`.
   *
   * If this parameter isn't included, the entire media duration is recorded
   * into a single `Blob` unless the `requestData()` method is called to
   * obtain the `Blob` and trigger the creation of a new `Blob` into which
   * the media continues to be recorded.
   */
  timeslice?: number;

  /**
   * A custom handler for the `datavailable` event.
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
}

/**
 * The error state of the recorder.
 */
interface RecorderErrorState extends RecorderStateBase {
  isError: true;
  isRecording: false;
  isFinalized: false;
  error: Error;
  startTime: null;
  endTime: null;
  segments: [];
}

/**
 * The recording state of the recorder.
 */
interface RecorderRecordingState extends RecorderStateBase {
  isError: false;
  isRecording: true;
  isFinalized: false;
  error: null;
  startTime: DOMHighResTimeStamp;
  endTime: null;
  segments: [];
}

/**
 * The final state of the recorder.
 */
interface RecorderFinalizedState extends RecorderStateBase {
  isError: false;
  isRecording: false;
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
  | RecorderErrorState
  | RecorderRecordingState
  | RecorderFinalizedState;

/**
 * Hook that facilitates recording {@link MediaStream} `media` with a {@link MediaRecorder}.
 * @returns See {@link RecorderState} for more information.
 */
export function useMediaRecorder(): RecorderState {
  // we need _both_ a referentially stable version of MediaRecorder and a mutable version
  // so that we can have stable start/stop functions, but also dynamic state updates
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [isRecorderDirty, setIsRecorderDirty] = useState<boolean>(false);
  const recorder = useMemo(() => {
    if (isRecorderDirty) setIsRecorderDirty(false);

    return recorderRef.current ?? undefined;
  }, [recorderRef, isRecorderDirty]);

  const recorderState = useMediaRecorderState(recorder);
  const isRecording = useMemo(
    () => recorderState === "recording",
    [recorderState],
  );

  const error = useMediaRecorderError(recorder);
  const isError = useMemo(() => error !== null, [error]);

  const [startTime, setStartTime] = useState<DOMHighResTimeStamp | null>(null);
  const [endTime, setEndTime] = useState<DOMHighResTimeStamp | null>(null);

  const [segments, setSegments] = useState<Blob[]>([]);
  const isFinalized = useMemo(
    () =>
      segments.length > 0 && recorderState === "inactive" && endTime !== null,
    [segments, recorderState, endTime],
  );

  const startRecording = useCallback(function startRecordingMedia(
    media: MediaStream,
    options?: RecorderOptions,
  ) {
    const { timeslice, dataAvailableHandler, ...recorderOptions } = {
      timeslice: 30 * 1000 /* 30s */,
      dataAvailableHandler: (
        ev: BlobEvent,
        callback: (value: React.SetStateAction<Blob[]>) => void,
      ) => {
        callback((current) => current.concat(ev.data));
      },
      ...options,
    };

    const recorder = new MediaRecorder(media, recorderOptions);

    recorder.addEventListener("dataavailable", function onDataAvailable(ev) {
      dataAvailableHandler(ev, setSegments);
    });

    setSegments([]);
    setEndTime(null);

    const startTime = performance.now();
    recorder.start(timeslice);

    setStartTime(startTime);

    recorderRef.current = recorder;
    setIsRecorderDirty(true);
  }, []);

  const stopRecording = useCallback(function stopRecordingMedia() {
    const endTime = performance.now();

    recorderRef.current?.addEventListener(
      "stop",
      function onStopCompleted() {
        setEndTime(endTime);
      },
      { once: true },
    );

    recorderRef.current?.stop();
  }, []);

  const state = {
    isError,
    isRecording,
    isFinalized,
    error,
    segments,
    startTime,
    endTime,
    startRecording,
    stopRecording,
  } satisfies ShallowShapeOf<RecorderState>;

  // we cast, as it isn't worth the runtime cost to check that this
  // lines up with each condition (isError, isLoading, isReady)
  return state as RecorderState;
}

/**
 * Helper hook (internal only) that observes a {@link MediaRecorder.state}
 * @param recorder the {@link MediaRecorder} to observe.
 * @returns The `recorder` state.
 */
function useMediaRecorderState(recorder: MediaRecorder | undefined) {
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
        return recorder?.state ?? "unavailable";
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
function useMediaRecorderError(recorder: MediaRecorder | undefined) {
  const [error, setError] = useState<Error | null>(null);

  useEffect(
    function observeRecorderError() {
      if (recorder) {
        const onError = () => {
          setError(new Error(`MediaRecorder encountered an unknown error.`));
        };
        recorder.addEventListener("error", onError);

        return function teardown() {
          recorder.removeEventListener("error", onError);
        };
      }
    },
    [recorder],
  );

  return error;
}
