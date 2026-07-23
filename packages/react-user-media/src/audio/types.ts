/**
 * A PCM audio frame that can be moved to a Dedicated Worker.
 *
 * Each channel owns an independent `Float32Array`. Pass its underlying
 * `ArrayBuffer`s to `Comlink.transfer` when submitting frames on the hot path.
 */
export interface AudioFrame {
  channelData: Float32Array[];
  sampleRate: number;
  timestamp?: number;
}

/**
 * Configuration shared by the audio worker's level-analysis jobs.
 */
export interface AudioProcessOptions {
  sampleRate: number;
}

/**
 * Level metrics calculated for an {@link AudioFrame}.
 */
export interface AudioProcessResult {
  frameLength: number;
  peak: number;
  rms: number;
  timestamp?: number;
}

export type AudioProcessSubscriber = (
  result: AudioProcessResult,
) => void | Promise<void>;

/**
 * Audio-specific job surface exposed from the Dedicated Worker.
 *
 * Its configure/process/subscribe/dispose lifecycle intentionally mirrors the
 * transferable job shape future media-specific worker APIs can use.
 */
export interface AudioWorkerApi {
  configure(options: AudioProcessOptions): Promise<void>;
  processFrame(frame: AudioFrame): Promise<AudioProcessResult>;
  subscribe(onResult: AudioProcessSubscriber): Promise<void>;
  dispose(): Promise<void>;
}
