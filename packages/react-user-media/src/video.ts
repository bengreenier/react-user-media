/**
 * A video job frame for processor strategies that operate on buffered frames.
 * Prefer transferring the `VideoFrame` with Comlink on worker hot paths.
 */
export interface VideoJobFrame {
  readonly frame: VideoFrame;
  readonly timestamp?: number;
}

/**
 * Common processing options for video strategies.
 */
export interface VideoProcessOptions {
  readonly metricIntervalMs?: number;
  /**
   * Worker/job mode. `"summary"` (default) returns frame metadata.
   * `"encode"` attempts WebCodecs `VideoEncoder` when supported.
   */
  readonly mode?: "summary" | "encode";
  /** Required when `mode` is `"encode"`. */
  readonly codec?: string;
  readonly width?: number;
  readonly height?: number;
  readonly bitrate?: number;
  readonly framerate?: number;
}

/**
 * A summary or encode result emitted by a video processor.
 */
export interface VideoProcessResult {
  readonly width: number;
  readonly height: number;
  readonly timestamp: number;
  readonly format?: string | null;
  readonly codedWidth?: number;
  readonly codedHeight?: number;
  readonly encoded?: {
    readonly byteLength: number;
    readonly type: EncodedVideoChunkType;
    readonly timestamp: number;
    readonly duration: number | null;
    readonly data: ArrayBuffer;
  };
}

/**
 * Available video processing strategies.
 */
export type VideoProcessingStrategy = "track" | "worker" | "track-rpc";

interface VideoProcessorStateBase {
  readonly isLoading: boolean;
  readonly isReady: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly result: VideoProcessResult | null;
  start(media: MediaStream): void;
  stop(): void;
}

export interface VideoProcessorIdleState extends VideoProcessorStateBase {
  readonly isLoading: false;
  readonly isReady: false;
  readonly isError: false;
  readonly error: null;
  readonly result: null;
}

export interface VideoProcessorLoadingState extends VideoProcessorStateBase {
  readonly isLoading: true;
  readonly isReady: false;
  readonly isError: false;
  readonly error: null;
  readonly result: null;
}

export interface VideoProcessorReadyState extends VideoProcessorStateBase {
  readonly isLoading: false;
  readonly isReady: true;
  readonly isError: false;
  readonly error: null;
}

export interface VideoProcessorErrorState extends VideoProcessorStateBase {
  readonly isLoading: false;
  readonly isReady: false;
  readonly isError: true;
  readonly error: Error;
  readonly result: null;
}

export type VideoProcessorState =
  | VideoProcessorIdleState
  | VideoProcessorLoadingState
  | VideoProcessorReadyState
  | VideoProcessorErrorState;

export interface MediaVideoProcessorOptions extends VideoProcessOptions {
  /**
   * Realtime MediaStreamTrackProcessor strategy (root hook).
   * Use `@bengreenier/react-user-media/video-track-rpc` for track-rpc.
   */
  readonly strategy: "track";
  /**
   * Override pipeline creation for tests and alternate environments.
   */
  readonly createPipeline?: CreateVideoTrackPipeline;
}

export type CreateVideoTrackPipeline = (
  track: MediaStreamTrack,
  options: {
    metricIntervalMs: number;
    onResult: (result: VideoProcessResult) => void;
    signal: AbortSignal;
  },
) => Promise<VideoTrackPipeline>;

export interface VideoTrackPipeline {
  readonly stop: () => void;
}
