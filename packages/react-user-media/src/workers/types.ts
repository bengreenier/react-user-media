/**
 * Core types for media worker operations
 */

/**
 * Message types that can be sent to/from the media worker
 */
export type MediaWorkerMessageType = 
  | 'INIT'
  | 'START_RECORDING'
  | 'STOP_RECORDING'
  | 'PROCESS_MEDIA'
  | 'GET_DEVICES'
  | 'ERROR'
  | 'SUCCESS'
  | 'DATA_AVAILABLE';

/**
 * Base message structure for worker communication
 */
export interface MediaWorkerMessage<T = unknown> {
  id: string;
  type: MediaWorkerMessageType;
  payload?: T;
  error?: string;
}

/**
 * Recording configuration for worker operations
 */
export interface MediaWorkerRecordingConfig {
  mimeType?: string;
  timeslice?: number;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
  bitsPerSecond?: number;
}

/**
 * Media processing options
 */
export interface MediaWorkerProcessingOptions {
  operation: 'compress' | 'convert' | 'extract_audio' | 'extract_video' | 'resize';
  options?: Record<string, unknown>;
}

/**
 * Device information from worker
 */
export interface MediaWorkerDeviceInfo {
  deviceId: string;
  kind: MediaDeviceKind;
  label: string;
  groupId: string;
}

/**
 * Worker state information
 */
export interface MediaWorkerState {
  isInitialized: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  recordingStartTime: number | null;
  recordingEndTime: number | null;
  segments: Blob[];
  mimeType: string | null;
}

/**
 * Worker controller interface for abstraction
 */
export interface MediaWorkerController {
  /**
   * Initialize the worker
   */
  initialize(): Promise<void>;
  
  /**
   * Start recording with the given configuration
   */
  startRecording(config?: MediaWorkerRecordingConfig): Promise<void>;
  
  /**
   * Stop recording
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
   * Get current worker state
   */
  getState(): MediaWorkerState;
  
  /**
   * Subscribe to worker events
   */
  subscribe(callback: (message: MediaWorkerMessage) => void): () => void;
  
  /**
   * Clean up and terminate worker
   */
  terminate(): void;
}

/**
 * Worker factory function type
 */
export type MediaWorkerFactory = () => MediaWorkerController;