import type { VideoProcessResult, VideoTrackPipeline } from "../video";
import { summarizeVideoFrame } from "./summary";
import { getMediaStreamTrackProcessorConstructor } from "./types";

export interface CreateSummaryTrackPipelineOptions {
  metricIntervalMs?: number;
  onResult: (result: VideoProcessResult) => void;
  signal: AbortSignal;
  /**
   * Optional injection for tests that cannot construct a real processor.
   */
  createReadable?: (track: MediaStreamTrack) => ReadableStream<VideoFrame>;
}

/**
 * Wires MediaStreamTrackProcessor → TransformStream that posts throttled
 * frame summaries and closes every input frame (metrics-only path).
 */
export async function createSummaryTrackPipeline(
  track: MediaStreamTrack,
  options: CreateSummaryTrackPipelineOptions,
): Promise<VideoTrackPipeline> {
  if (track.kind !== "video") {
    throw new Error("Video track processor requires a video MediaStreamTrack");
  }

  const Processor = getMediaStreamTrackProcessorConstructor();
  const readable =
    options.createReadable?.(track) ??
    (() => {
      if (!Processor) {
        throw new Error("MediaStreamTrackProcessor is not available");
      }
      return new Processor({ track }).readable;
    })();

  const metricIntervalMs = options.metricIntervalMs ?? 1000 / 30;
  let lastPostedAt = 0;
  let reader: ReadableStreamDefaultReader<VideoFrame> | undefined;

  const pump = async () => {
    reader = readable.getReader();
    try {
      while (!options.signal.aborted) {
        const { done, value: frame } = await reader.read();
        if (done || !frame) {
          break;
        }

        try {
          const now = performance.now();
          if (now - lastPostedAt >= metricIntervalMs) {
            lastPostedAt = now;
            options.onResult(summarizeVideoFrame(frame));
          }
        } finally {
          frame.close();
        }
      }
    } catch (error) {
      if (!options.signal.aborted) {
        throw error;
      }
    } finally {
      try {
        reader?.releaseLock();
      } catch {
        // reader may already be canceled
      }
    }
  };

  const running = pump();

  return {
    stop() {
      try {
        const activeReader = reader;
        reader = undefined;
        void activeReader?.cancel().catch(() => undefined);
      } catch {
        // ignore cancel races during teardown
      }
      void running.catch(() => undefined);
    },
  };
}

export function isMediaStreamTrackProcessorSupported(): boolean {
  return getMediaStreamTrackProcessorConstructor() !== undefined;
}
