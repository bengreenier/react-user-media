import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ShallowShapeOf } from '../types';
import type {
  MediaWorkerController,
  MediaWorkerState,
  MediaWorkerRecordingConfig,
  MediaWorkerProcessingOptions,
  MediaWorkerDeviceInfo,
  MediaWorkerMessage,
} from './types';
import { getWorkerFactory } from './worker-factory';

/**
 * Configuration for the useMediaWorker hook
 */
export interface UseMediaWorkerConfig {
  /**
   * Worker instance ID
   * @default 'default'
   */
  workerId?: string;
  
  /**
   * Whether to use mock worker for testing
   * @default false
   */
  useMockWorker?: boolean;
  
  /**
   * Custom worker script for production
   */
  workerScript?: string;
  
  /**
   * Auto-initialize worker on mount
   * @default true
   */
  autoInitialize?: boolean;
}

/**
 * State of the media worker hook
 */
export interface MediaWorkerHookState {
  /**
   * Whether the worker is initialized
   */
  isInitialized: boolean;
  
  /**
   * Whether the worker is currently recording
   */
  isRecording: boolean;
  
  /**
   * Whether the worker is currently processing media
   */
  isProcessing: boolean;
  
  /**
   * Whether the worker is in an error state
   */
  isError: boolean;
  
  /**
   * Current error message, if any
   */
  error: string | null;
  
  /**
   * Current worker state
   */
  workerState: MediaWorkerState;
  
  /**
   * Available media devices
   */
  devices: MediaWorkerDeviceInfo[];
  
  /**
   * Whether devices are being loaded
   */
  isLoadingDevices: boolean;
  
  /**
   * Initialize the worker
   */
  initialize(): Promise<void>;
  
  /**
   * Start recording with the given configuration
   */
  startRecording(config?: MediaWorkerRecordingConfig): Promise<void>;
  
  /**
   * Stop recording and return recorded segments
   */
  stopRecording(): Promise<Blob[]>;
  
  /**
   * Process media data
   */
  processMedia(data: Blob, options: MediaWorkerProcessingOptions): Promise<Blob>;
  
  /**
   * Get available media devices
   */
  getDevices(): Promise<MediaWorkerDeviceInfo[]>;
  
  /**
   * Subscribe to worker messages
   */
  subscribe(callback: (message: MediaWorkerMessage) => void): () => void;
  
  /**
   * Terminate the worker
   */
  terminate(): void;
}

/**
 * Hook for managing media operations through workers
 * @param config Configuration for the worker
 * @returns MediaWorkerHookState
 */
export function useMediaWorker(config: UseMediaWorkerConfig = {}): MediaWorkerHookState {
  const {
    workerId = 'default',
    useMockWorker = false,
    workerScript,
    autoInitialize = true,
  } = config;

  const [workerState, setWorkerState] = useState<MediaWorkerState>({
    isInitialized: false,
    isRecording: false,
    isProcessing: false,
    error: null,
    recordingStartTime: null,
    recordingEndTime: null,
    segments: [],
    mimeType: null,
  });

  const [devices, setDevices] = useState<MediaWorkerDeviceInfo[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<MediaWorkerController | null>(null);
  const factoryRef = useRef(getWorkerFactory({ useMockWorker, workerScript }));

  // Update factory config when it changes
  useEffect(() => {
    factoryRef.current.updateConfig({ useMockWorker, workerScript });
  }, [useMockWorker, workerScript]);

  // Get or create worker instance
  const getWorker = useCallback((): MediaWorkerController => {
    if (!workerRef.current) {
      workerRef.current = factoryRef.current.createWorker(workerId);
    }
    return workerRef.current;
  }, [workerId]);

  // Auto-initialize worker
  useEffect(() => {
    if (autoInitialize && !workerState.isInitialized) {
      initialize();
    }
  }, [autoInitialize, workerState.isInitialized]);

  // Subscribe to worker state changes
  useEffect(() => {
    const worker = getWorker();
    const unsubscribe = worker.subscribe((message) => {
      // Update local state based on worker messages
      if (message.type === 'SUCCESS' || message.type === 'ERROR') {
        const newState = worker.getState();
        setWorkerState(newState);
        
        if (message.type === 'ERROR') {
          setError(message.error || 'Unknown error');
        } else {
          setError(null);
        }
      }
    });

    return unsubscribe;
  }, [getWorker]);

  const initialize = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const worker = getWorker();
      await worker.initialize();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize worker';
      setError(errorMessage);
      throw err;
    }
  }, [getWorker]);

  const startRecording = useCallback(async (config?: MediaWorkerRecordingConfig): Promise<void> => {
    try {
      setError(null);
      const worker = getWorker();
      await worker.startRecording(config);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      throw err;
    }
  }, [getWorker]);

  const stopRecording = useCallback(async (): Promise<Blob[]> => {
    try {
      setError(null);
      const worker = getWorker();
      return await worker.stopRecording();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(errorMessage);
      throw err;
    }
  }, [getWorker]);

  const processMedia = useCallback(async (
    data: Blob,
    options: MediaWorkerProcessingOptions
  ): Promise<Blob> => {
    try {
      setError(null);
      const worker = getWorker();
      return await worker.processMedia(data, options);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process media';
      setError(errorMessage);
      throw err;
    }
  }, [getWorker]);

  const getDevices = useCallback(async (): Promise<MediaWorkerDeviceInfo[]> => {
    try {
      setIsLoadingDevices(true);
      setError(null);
      const worker = getWorker();
      const deviceList = await worker.getDevices();
      setDevices(deviceList);
      return deviceList;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get devices';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoadingDevices(false);
    }
  }, [getWorker]);

  const subscribe = useCallback((callback: (message: MediaWorkerMessage) => void): (() => void) => {
    const worker = getWorker();
    return worker.subscribe(callback);
  }, [getWorker]);

  const terminate = useCallback((): void => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    factoryRef.current.removeWorker(workerId);
    setWorkerState({
      isInitialized: false,
      isRecording: false,
      isProcessing: false,
      error: null,
      recordingStartTime: null,
      recordingEndTime: null,
      segments: [],
      mimeType: null,
    });
    setDevices([]);
    setError(null);
  }, [workerId]);

  // Computed state
  const isInitialized = useMemo(() => workerState.isInitialized, [workerState.isInitialized]);
  const isRecording = useMemo(() => workerState.isRecording, [workerState.isRecording]);
  const isProcessing = useMemo(() => workerState.isProcessing, [workerState.isProcessing]);
  const isError = useMemo(() => error !== null || workerState.error !== null, [error, workerState.error]);

  const state: MediaWorkerHookState = {
    isInitialized,
    isRecording,
    isProcessing,
    isError,
    error: error || workerState.error,
    workerState,
    devices,
    isLoadingDevices,
    initialize,
    startRecording,
    stopRecording,
    processMedia,
    getDevices,
    subscribe,
    terminate,
  };

  return state;
}