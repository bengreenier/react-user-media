export type {
  VideoJobFrame,
  VideoProcessOptions,
  VideoProcessResult,
} from "../video";

import type {
  VideoJobFrame,
  VideoProcessOptions,
  VideoProcessResult,
} from "../video";

export type VideoProcessSubscriber = (
  result: VideoProcessResult,
) => void | Promise<void>;

/**
 * Video-specific job surface exposed from the Dedicated Worker.
 */
export interface VideoWorkerApi {
  configure(options: VideoProcessOptions): Promise<void>;
  processFrame(frame: VideoJobFrame): Promise<VideoProcessResult>;
  subscribe(onResult: VideoProcessSubscriber): Promise<void>;
  dispose(): Promise<void>;
}
