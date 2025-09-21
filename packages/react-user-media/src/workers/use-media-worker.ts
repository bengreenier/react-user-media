import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ShallowShapeOf } from '../types';
import type {
  MediaWorkerController,
  MediaWorkerState,
  VideoProcessingConfig,
  AudioProcessingConfig,
  VideoFrameProcessingOptions,
  AudioDataProcessingOptions,
  CodecCapabilities,
  ProcessedVideoFrame,
  ProcessedAudioData,
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
   * Available codec capabilities
   */
  codecCapabilities: CodecCapabilities[];
  
  /**
   * Whether codec capabilities are being loaded
   */
  isLoadingCapabilities: boolean;
  
  /**
   * Initialize the worker
   */
  initialize(): Promise<void>;
  
  /**
   * Process a video frame
   */
  processVideoFrame(
    frame: VideoFrame, 
    options: VideoFrameProcessingOptions
  ): Promise<ProcessedVideoFrame>;
  
  /**
   * Process audio data
   */
  processAudioData(
    data: AudioData, 
    options: AudioDataProcessingOptions
  ): Promise<ProcessedAudioData>;
  
  /**
   * Encode video frames
   */
  encodeVideo(
    frames: VideoFrame[], 
    config: VideoProcessingConfig
  ): Promise<EncodedVideoChunk[]>;
  
  /**
   * Encode audio data
   */
  encodeAudio(
    data: AudioData[], 
    config: AudioProcessingConfig
  ): Promise<EncodedAudioChunk[]>;
  
  /**
   * Decode video chunks
   */
  decodeVideo(
    chunks: EncodedVideoChunk[], 
    config: VideoProcessingConfig
  ): Promise<VideoFrame[]>;
  
  /**
   * Decode audio chunks
   */
  decodeAudio(
    chunks: EncodedAudioChunk[], 
    config: AudioProcessingConfig
  ): Promise<AudioData[]>;
  
  /**
   * Configure codec
   */
  configureCodec(
    type: 'video' | 'audio',
    config: VideoProcessingConfig | AudioProcessingConfig
  ): Promise<void>;
  
  /**
   * Get codec capabilities
   */
  getCodecCapabilities(): Promise<CodecCapabilities[]>;
  
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

  const [codecCapabilities, setCodecCapabilities] = useState<CodecCapabilities[]>([]);
  const [isLoadingCapabilities, setIsLoadingCapabilities] = useState(false);
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

  const processVideoFrame = useCallback(async (
    frame: VideoFrame,
    options: VideoFrameProcessingOptions
  ): Promise<ProcessedVideoFrame> => {
    try {
      setError(null);
      const worker = getWorker();
      return await worker.processVideoFrame(frame, options);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process video frame';
      setError(errorMessage);
      throw err;
    }
  }, [getWorker]);

  const processAudioData = useCallback(async (
    data: AudioData,
    options: AudioDataProcessingOptions
  ): Promise<ProcessedAudioData> => {
    try {
      setError(null);
      const worker = getWorker();
      return await worker.processAudioData(data, options);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process audio data';
      setError(errorMessage);
      throw err;
    }
  }, [getWorker]);

  const encodeVideo = useCallback(async (
    frames: VideoFrame[],
    config: VideoProcessingConfig
  ): Promise<EncodedVideoChunk[]> => {
    try {
      setError(null);
      const worker = getWorker();
      return await worker.encodeVideo(frames, config);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to encode video';
      setError(errorMessage);
      throw err;
    }
  }, [getWorker]);

  const encodeAudio = useCallback(async (
    data: AudioData[],
    config: AudioProcessingConfig
  ): Promise<EncodedAudioChunk[]> => {
    try {
      setError(null);
      const worker = getWorker();
      return await worker.encodeAudio(data, config);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to encode audio';
      setError(errorMessage);
      throw err;
    }
  }, [getWorker]);

  const decodeVideo = useCallback(async (
    chunks: EncodedVideoChunk[],
    config: VideoProcessingConfig
  ): Promise<VideoFrame[]> => {
    try {
      setError(null);
      const worker = getWorker();
      return await worker.decodeVideo(chunks, config);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decode video';
      setError(errorMessage);
      throw err;
    }
  }, [getWorker]);

  const decodeAudio = useCallback(async (
    chunks: EncodedAudioChunk[],
    config: AudioProcessingConfig
  ): Promise<AudioData[]> => {
    try {
      setError(null);
      const worker = getWorker();
      return await worker.decodeAudio(chunks, config);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decode audio';
      setError(errorMessage);
      throw err;
    }
  }, [getWorker]);

  const configureCodec = useCallback(async (
    type: 'video' | 'audio',
    config: VideoProcessingConfig | AudioProcessingConfig
  ): Promise<void> => {
    try {
      setError(null);
      const worker = getWorker();
      return await worker.configureCodec(type, config);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to configure codec';
      setError(errorMessage);
      throw err;
    }
  }, [getWorker]);

  const getCodecCapabilities = useCallback(async (): Promise<CodecCapabilities[]> => {
    try {
      setIsLoadingCapabilities(true);
      setError(null);
      const worker = getWorker();
      const capabilities = await worker.getCodecCapabilities();
      setCodecCapabilities(capabilities);
      return capabilities;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get codec capabilities';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoadingCapabilities(false);
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
      isProcessing: false,
      error: null,
      videoConfig: null,
      audioConfig: null,
      codecCapabilities: [],
    });
    setCodecCapabilities([]);
    setError(null);
  }, [workerId]);

  // Computed state
  const isInitialized = useMemo(() => workerState.isInitialized, [workerState.isInitialized]);
  const isProcessing = useMemo(() => workerState.isProcessing, [workerState.isProcessing]);
  const isError = useMemo(() => error !== null || workerState.error !== null, [error, workerState.error]);

  const state: MediaWorkerHookState = {
    isInitialized,
    isProcessing,
    isError,
    error: error || workerState.error,
    workerState,
    codecCapabilities,
    isLoadingCapabilities,
    initialize,
    processVideoFrame,
    processAudioData,
    encodeVideo,
    encodeAudio,
    decodeVideo,
    decodeAudio,
    configureCodec,
    getCodecCapabilities,
    subscribe,
    terminate,
  };

  return state;
}