/**
 * Core types for WebCodecs-based media worker operations
 */

/**
 * Message types that can be sent to/from the media worker
 */
export type MediaWorkerMessageType = 
  | 'INIT'
  | 'PROCESS_VIDEO_FRAME'
  | 'PROCESS_AUDIO_DATA'
  | 'ENCODE_VIDEO'
  | 'ENCODE_AUDIO'
  | 'DECODE_VIDEO'
  | 'DECODE_AUDIO'
  | 'CONFIGURE_CODEC'
  | 'GET_CODEC_CAPABILITIES'
  | 'ERROR'
  | 'SUCCESS'
  | 'FRAME_PROCESSED'
  | 'ENCODED_DATA';

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
 * Video processing configuration
 */
export interface VideoProcessingConfig {
  width?: number;
  height?: number;
  frameRate?: number;
  bitrate?: number;
  codec?: string;
  format?: 'I420' | 'I422' | 'I444' | 'NV12' | 'RGBA' | 'BGRA' | 'RGB24' | 'BGR24';
}

/**
 * Audio processing configuration
 */
export interface AudioProcessingConfig {
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  codec?: string;
  format?: 'f32' | 's16' | 's24' | 's32';
}

/**
 * Video frame processing options
 */
export interface VideoFrameProcessingOptions {
  operation: 'resize' | 'crop' | 'rotate' | 'filter' | 'convert_format' | 'extract_region';
  options?: {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    angle?: number;
    filter?: string;
    format?: string;
  };
}

/**
 * Audio data processing options
 */
export interface AudioDataProcessingOptions {
  operation: 'resample' | 'mix' | 'filter' | 'normalize' | 'convert_format' | 'extract_channels';
  options?: {
    sampleRate?: number;
    channels?: number;
    format?: string;
    filter?: string;
    gain?: number;
  };
}

/**
 * Codec capabilities information
 */
export interface CodecCapabilities {
  supported: boolean;
  codec: string;
  hardwareAccelerated: boolean;
  maxWidth?: number;
  maxHeight?: number;
  maxFrameRate?: number;
  maxBitrate?: number;
}

/**
 * Processed video frame result
 */
export interface ProcessedVideoFrame {
  data: ArrayBuffer;
  width: number;
  height: number;
  format: string;
  timestamp: number;
}

/**
 * Processed audio data result
 */
export interface ProcessedAudioData {
  data: ArrayBuffer;
  sampleRate: number;
  channels: number;
  format: string;
  duration: number;
}

/**
 * Worker state information
 */
export interface MediaWorkerState {
  isInitialized: boolean;
  isProcessing: boolean;
  error: string | null;
  videoConfig: VideoProcessingConfig | null;
  audioConfig: AudioProcessingConfig | null;
  codecCapabilities: CodecCapabilities[];
}

/**
 * Worker controller interface for WebCodecs operations
 */
export interface MediaWorkerController {
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