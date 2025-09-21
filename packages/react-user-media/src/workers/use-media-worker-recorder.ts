import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ShallowShapeOf } from '../types';
import type { MediaWorkerRecordingConfig } from './types';
import { useMediaWorker, type UseMediaWorkerConfig } from './use-media-worker';

/**
 * Configuration for the media worker recorder
 */
export interface MediaWorkerRecorderConfig extends UseMediaWorkerConfig {
  /**
   * Default recording configuration
   */
  defaultRecordingConfig?: MediaWorkerRecordingConfig;
  
  /**
   * Auto-start recording when initialized
   * @default false
   */
  autoStartRecording?: boolean;
}

/**
 * State of the media worker recorder
 */
export interface MediaWorkerRecorderState {
  /**
   * Whether the recorder is initialized
   */
  isInitialized: boolean;
  
  /**
   * Whether the recorder is currently recording
   */
  isRecording: boolean;
  
  /**
   * Whether the recorder is in an error state
   */
  isError: boolean;
  
  /**
   * Current error message, if any
   */
  error: string | null;
  
  /**
   * Time when recording started
   */
  startTime: number | null;
  
  /**
   * Time when recording ended
   */
  endTime: number | null;
  
  /**
   * Recorded segments
   */
  segments: Blob[];
  
  /**
   * MIME type of the recording
   */
  mimeType: string | null;
  
  /**
   * Whether recording is finalized (stopped and ready)
   */
  isFinalized: boolean;
  
  /**
   * Start recording with the given configuration
   */
  startRecording(config?: MediaWorkerRecordingConfig): Promise<void>;
  
  /**
   * Stop recording and return recorded segments
   */
  stopRecording(): Promise<Blob[]>;
  
  /**
   * Get the current recording configuration
   */
  getRecordingConfig(): MediaWorkerRecordingConfig | null;
  
  /**
   * Clear recorded segments
   */
  clearSegments(): void;
  
  /**
   * Get recording duration in milliseconds
   */
  getDuration(): number | null;
  
  /**
   * Terminate the recorder
   */
  terminate(): void;
}

/**
 * Hook for managing media recording through workers
 * @param config Configuration for the recorder
 * @returns MediaWorkerRecorderState
 */
export function useMediaWorkerRecorder(config: MediaWorkerRecorderConfig = {}): MediaWorkerRecorderState {
  const {
    defaultRecordingConfig,
    autoStartRecording = false,
    ...workerConfig
  } = config;

  const worker = useMediaWorker(workerConfig);
  const [recordingConfig, setRecordingConfig] = useState<MediaWorkerRecordingConfig | null>(
    defaultRecordingConfig || null
  );

  // Auto-start recording if configured
  useEffect(() => {
    if (autoStartRecording && worker.isInitialized && !worker.isRecording) {
      startRecording();
    }
  }, [autoStartRecording, worker.isInitialized, worker.isRecording]);

  const startRecording = useCallback(async (config?: MediaWorkerRecordingConfig): Promise<void> => {
    const finalConfig = config || recordingConfig || defaultRecordingConfig;
    if (finalConfig) {
      setRecordingConfig(finalConfig);
    }
    await worker.startRecording(finalConfig);
  }, [worker, recordingConfig, defaultRecordingConfig]);

  const stopRecording = useCallback(async (): Promise<Blob[]> => {
    return await worker.stopRecording();
  }, [worker]);

  const getRecordingConfig = useCallback((): MediaWorkerRecordingConfig | null => {
    return recordingConfig;
  }, [recordingConfig]);

  const clearSegments = useCallback((): void => {
    // This would need to be implemented in the worker
    // For now, we'll just clear the local state
    setRecordingConfig(null);
  }, []);

  const getDuration = useCallback((): number | null => {
    const { startTime, endTime } = worker.workerState;
    if (startTime && endTime) {
      return endTime - startTime;
    }
    if (startTime && worker.isRecording) {
      return performance.now() - startTime;
    }
    return null;
  }, [worker.workerState, worker.isRecording]);

  // Computed state
  const isInitialized = useMemo(() => worker.isInitialized, [worker.isInitialized]);
  const isRecording = useMemo(() => worker.isRecording, [worker.isRecording]);
  const isError = useMemo(() => worker.isError, [worker.isError]);
  const error = useMemo(() => worker.error, [worker.error]);
  const startTime = useMemo(() => worker.workerState.recordingStartTime, [worker.workerState.recordingStartTime]);
  const endTime = useMemo(() => worker.workerState.recordingEndTime, [worker.workerState.recordingEndTime]);
  const segments = useMemo(() => worker.workerState.segments, [worker.workerState.segments]);
  const mimeType = useMemo(() => worker.workerState.mimeType, [worker.workerState.mimeType]);
  
  const isFinalized = useMemo(() => {
    return segments.length > 0 && 
           worker.workerState.recordingEndTime !== null && 
           !worker.isRecording;
  }, [segments.length, worker.workerState.recordingEndTime, worker.isRecording]);

  const state: MediaWorkerRecorderState = {
    isInitialized,
    isRecording,
    isError,
    error,
    startTime,
    endTime,
    segments,
    mimeType,
    isFinalized,
    startRecording,
    stopRecording,
    getRecordingConfig,
    clearSegments,
    getDuration,
    terminate: worker.terminate,
  };

  return state;
}