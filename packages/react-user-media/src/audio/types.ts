export type {
  AudioFrame,
  AudioProcessOptions,
  AudioProcessResult,
} from "../audio";

import type {
  AudioFrame,
  AudioProcessOptions,
  AudioProcessResult,
} from "../audio";

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
