import { proxy, releaseProxy, wrap } from "comlink";
import type { VideoProcessResult, VideoTrackPipeline } from "../../video";
import { isMediaStreamTrackProcessorSupported } from "../../video-track-processor";
import { getMediaStreamTrackProcessorConstructor } from "../../video-track-processor/types";
import {
  TrackRpcController,
  type VideoTrackRpcApi,
  type VideoTrackRpcOptions,
} from "./controller";
import { exposeTrackRpc } from "./port";

export type VideoTrackRpcSessionOptions = {
  createPipeline?: (
    track: MediaStreamTrack,
    options: {
      signal: AbortSignal;
      onFrame: (frame: VideoFrame) => void;
    },
  ) => Promise<VideoTrackPipeline>;
  createReadable?: (track: MediaStreamTrack) => ReadableStream<VideoFrame>;
  onResult?: (result: VideoProcessResult) => void;
  processOptions?: VideoTrackRpcOptions;
};

export type VideoTrackRpcSession = {
  api: VideoTrackRpcApi;
  dispose(): Promise<void>;
};

export async function createVideoTrackRpcSession(
  stream: MediaStream,
  options: VideoTrackRpcSessionOptions = {},
): Promise<VideoTrackRpcSession> {
  if (!options.createPipeline && !isMediaStreamTrackProcessorSupported()) {
    throw new Error("MediaStreamTrackProcessor is not available");
  }

  const track = stream.getVideoTracks()[0];
  if (!track) {
    throw new Error("MediaStream has no video track");
  }

  const controller = new TrackRpcController();
  if (options.processOptions) {
    await controller.configure(options.processOptions);
  }

  const channel = new MessageChannel();
  exposeTrackRpc(controller, channel.port1);
  const api = wrap<VideoTrackRpcApi>(channel.port2);

  const resultCallback = options.onResult ? proxy(options.onResult) : undefined;
  if (resultCallback) {
    await api.subscribe(resultCallback);
  }

  const abort = new AbortController();
  const pipeline = options.createPipeline
    ? await options.createPipeline(track, {
        signal: abort.signal,
        onFrame: (frame) => {
          controller.handleFrame(frame);
        },
      })
    : await createControllerFedPipeline(
        track,
        controller,
        abort.signal,
        options.createReadable,
      );

  let disposed = false;
  return {
    api,
    async dispose(): Promise<void> {
      if (disposed) {
        return;
      }
      disposed = true;
      abort.abort();
      pipeline.stop();
      try {
        await api.dispose();
      } finally {
        resultCallback?.[releaseProxy]();
        api[releaseProxy]();
        channel.port1.close();
        channel.port2.close();
      }
    },
  };
}

async function createControllerFedPipeline(
  track: MediaStreamTrack,
  controller: TrackRpcController,
  signal: AbortSignal,
  createReadable?: (track: MediaStreamTrack) => ReadableStream<VideoFrame>,
): Promise<VideoTrackPipeline> {
  const Processor = getMediaStreamTrackProcessorConstructor();
  const readable =
    createReadable?.(track) ??
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
      while (!signal.aborted) {
        const { done, value: frame } = await reader.read();
        if (done || !frame) {
          break;
        }
        if (!controller.handleFrame(frame)) {
          break;
        }
      }
    } catch (error) {
      if (!signal.aborted) {
        throw error;
      }
    } finally {
      try {
        reader?.releaseLock();
      } catch {
        // ignore
      }
    }
  })();

  return {
    stop() {
      try {
        const activeReader = reader;
        reader = undefined;
        void activeReader?.cancel().catch(() => undefined);
      } catch {
        // ignore
      }
      void running.catch(() => undefined);
    },
  };
}
