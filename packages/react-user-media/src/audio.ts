/**
 * A PCM audio frame for processor strategies that operate on buffered audio.
 * Future worker strategies can add video/WebCodecs frame types alongside this
 * audio-specific contract without changing the lifecycle surface.
 */
export interface AudioFrame {
  readonly data: Float32Array;
  readonly sampleRate: number;
  readonly timestamp: number;
  readonly numberOfChannels: number;
}

/**
 * Common processing options for audio strategies.
 */
export interface AudioProcessOptions {
  readonly metricIntervalMs?: number;
}

/**
 * A summary emitted by an audio processor.
 */
export interface AudioProcessResult {
  readonly rms: number;
  readonly peak: number;
  readonly timestamp: number;
}

/**
 * Available audio processing strategies. Worker and worklet-rpc are reserved
 * for additive future phases; this release implements only `worklet`.
 */
export type AudioProcessingStrategy = "worklet" | "worker" | "worklet-rpc";

interface AudioProcessorStateBase {
  readonly isLoading: boolean;
  readonly isReady: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly result: AudioProcessResult | null;
  start(media: MediaStream): void;
  stop(): void;
}

export interface AudioProcessorIdleState extends AudioProcessorStateBase {
  readonly isLoading: false;
  readonly isReady: false;
  readonly isError: false;
  readonly error: null;
  readonly result: null;
}

export interface AudioProcessorLoadingState extends AudioProcessorStateBase {
  readonly isLoading: true;
  readonly isReady: false;
  readonly isError: false;
  readonly error: null;
  readonly result: null;
}

export interface AudioProcessorReadyState extends AudioProcessorStateBase {
  readonly isLoading: false;
  readonly isReady: true;
  readonly isError: false;
  readonly error: null;
}

export interface AudioProcessorErrorState extends AudioProcessorStateBase {
  readonly isLoading: false;
  readonly isReady: false;
  readonly isError: true;
  readonly error: Error;
  readonly result: null;
}

export type AudioProcessorState =
  | AudioProcessorIdleState
  | AudioProcessorLoadingState
  | AudioProcessorReadyState
  | AudioProcessorErrorState;

export interface MediaAudioProcessorOptions extends AudioProcessOptions {
  /**
   * This phase supports the graph-native AudioWorklet strategy.
   */
  readonly strategy: "worklet";
  /**
   * An ESM URL passed to `audioWorklet.addModule`. Supply this when a bundler
   * cannot resolve the package's default ESM worklet module URL.
   */
  readonly workletModuleUrl?: string | URL;
  /**
   * Creates the owned AudioContext. This injection point supports tests and
   * applications with specialized browser audio context configuration.
   */
  readonly createAudioContext?: () => AudioContext;
}
