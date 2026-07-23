import type { VideoProcessResult } from "../video";

/**
 * Builds a frame summary without copying pixel buffers.
 */
export function summarizeVideoFrame(frame: VideoFrame): VideoProcessResult {
  return {
    width: frame.displayWidth || frame.codedWidth,
    height: frame.displayHeight || frame.codedHeight,
    timestamp: frame.timestamp,
    format: frame.format,
    codedWidth: frame.codedWidth,
    codedHeight: frame.codedHeight,
  };
}
