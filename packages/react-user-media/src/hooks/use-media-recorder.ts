import {
  useState,
  useMemo,
  useCallback,
  useSyncExternalStore,
  useEffect,
} from "react";
import { ShallowShapeOf } from "../types";

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
}

interface RecorderStateBase {
  isError: boolean;
  isRecording: boolean;
  isFinalized: boolean;

  error: Error | null;
  startTime: DOMHighResTimeStamp | null;
  endTime: DOMHighResTimeStamp | null;
  segments: Blob[];

  startRecording(media: MediaStream, options?: RecorderOptions): void;
  stopRecording(): void;
}

interface RecorderErrorState extends RecorderStateBase {
  isError: true;
  isRecording: false;
  isFinalized: false;
  error: Error;
  startTime: null;
  endTime: null;
  segments: [];
}

interface RecorderRecordingState extends RecorderStateBase {
  isError: false;
  isRecording: true;
  isFinalized: false;
  error: null;
  startTime: DOMHighResTimeStamp;
  endTime: null;
  segments: [];
}

interface RecorderFinalizedState extends RecorderStateBase {
  isError: false;
  isRecording: false;
  isFinalized: true;
  error: null;
  startTime: DOMHighResTimeStamp;
  endTime: DOMHighResTimeStamp;
  segments: Blob[];
}

export type RecorderState =
  | RecorderErrorState
  | RecorderRecordingState
  | RecorderFinalizedState;

export function useMediaRecorder(): RecorderState {
  const [recorder, setRecorder] = useState<MediaRecorder | undefined>(
    undefined,
  );

  const recorderState = useMediaRecorderState(recorder);
  const isRecording = useMemo(
    () => recorderState === "recording",
    [recorderState],
  );

  const error = useMediaRecorderError(recorder);
  const isError = useMemo(() => error !== null, [error]);

  const [segments, setSegments] = useState<Blob[]>([]);
  const isFinalized = useMemo(
    () => segments.length > 0 && recorderState === "inactive",
    [segments, recorderState],
  );

  const [startTime, setStartTime] = useState<DOMHighResTimeStamp | null>(null);
  const [endTime, setEndTime] = useState<DOMHighResTimeStamp | null>(null);

  const startRecording = useCallback(
    function startRecordingMedia(
      media: MediaStream,
      options?: RecorderOptions,
    ) {
      // don't allow multiple recordings at once
      if (isRecording) {
        return;
      }

      const { timeslice, ...recorderOptions } = {
        timeslice: 30 * 1000 /* 30s */,
        ...options,
      };

      const recorder = new MediaRecorder(media, recorderOptions);

      recorder.addEventListener("dataavailable", (ev) => {
        setSegments((current) => current.concat(ev.data));
      });

      setSegments([]);

      const startTime = performance.now();
      recorder.start(timeslice);

      setStartTime(startTime);
      setRecorder(recorder);
    },
    [isRecording],
  );

  const stopRecording = useCallback(
    function stopRecordingMedia() {
      // don't allow stopping of "nothing"
      if (!isRecording) {
        console.log("not recording");
        return;
      }

      const endTime = performance.now();

      recorder?.stop();

      setEndTime(endTime);
    },
    [isRecording, recorder],
  );

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
