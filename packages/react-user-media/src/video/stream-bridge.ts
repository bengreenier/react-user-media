import * as Comlink from "comlink";
import { isMediaStreamTrackProcessorSupported } from "../video-track-processor";
import { getMediaStreamTrackProcessorConstructor } from "../video-track-processor/types";
import type { VideoWorkerProxy } from "./use-video-worker";

export interface VideoStreamWorkerBridge {
  readonly stop: () => void;
}

/**
 * Optional convenience bridge that pulls live video frames into a ready
 * video worker. Does not acquire capture or stop tracks when stopped.
 *
 * Prefer the track-processor strategy for continuous realtime transforms.
 */
export async function createVideoStreamWorkerBridge(
  media: MediaStream,
  api: VideoWorkerProxy,
  options: {
    signal?: AbortSignal;
    createReadable?: (track: MediaStreamTrack) => ReadableStream<VideoFrame>;
  } = {},
): Promise<VideoStreamWorkerBridge> {
  if (!options.createReadable && !isMediaStreamTrackProcessorSupported()) {
    throw new Error("MediaStreamTrackProcessor is not available");
  }

  const track = media.getVideoTracks()[0];
  if (!track) {
    throw new Error("MediaStream has no video track");
  }

  const abort = new AbortController();
  if (options.signal) {
    if (options.signal.aborted) {
      abort.abort();
    } else {
      options.signal.addEventListener("abort", () => abort.abort(), {
        once: true,
      });
    }
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

  let reader: ReadableStreamDefaultReader<VideoFrame> | undefined;
  const running = (async () => {
    reader = readable.getReader();
    try {
      while (!abort.signal.aborted) {
        const { done, value: frame } = await reader.read();
        if (done || !frame) {
          break;
        }
        try {
          await api.processFrame(
            Comlink.transfer({ frame, timestamp: frame.timestamp }, [frame]),
          );
        } catch {
          try {
            frame.close();
          } catch {
            // ignore close after failed transfer ownership edge cases
          }
          if (abort.signal.aborted) {
            break;
          }
        }
      }
    } finally {
      const activeReader = reader;
      reader = undefined;
      try {
        activeReader?.releaseLock();
      } catch {
        // ignore if already canceled/released
      }
    }
  })();

  return {
    stop() {
      abort.abort();
      const activeReader = reader;
      reader = undefined;
      if (activeReader) {
        void activeReader.cancel().catch(() => undefined);
      }
      void running.catch(() => undefined);
    },
  };
}
