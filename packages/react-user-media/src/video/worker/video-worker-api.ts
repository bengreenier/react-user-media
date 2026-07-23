import type {
  VideoProcessOptions,
  VideoProcessResult,
  VideoProcessSubscriber,
  VideoWorkerApi,
} from "../types";

export interface VideoWorkerApiOverrides {
  configure?: (options: VideoProcessOptions) => void | Promise<void>;
  summarize?: (frame: VideoFrame) => VideoProcessResult;
  encode?: (
    frame: VideoFrame,
    options: VideoProcessOptions,
  ) => Promise<VideoProcessResult>;
}

/**
 * Creates the video job API exposed by the Dedicated Worker.
 */
export function createVideoWorkerApi(
  overrides: VideoWorkerApiOverrides = {},
): VideoWorkerApi {
  let isDisposed = false;
  let options: VideoProcessOptions | null = null;
  const subscribers = new Set<VideoProcessSubscriber>();
  let encoder: VideoEncoder | null = null;
  let pendingEncode: {
    resolve: (result: VideoProcessResult) => void;
    reject: (error: Error) => void;
  } | null = null;

  function assertActive() {
    if (isDisposed) {
      throw new Error("Video worker has been disposed");
    }
  }

  function closeEncoder() {
    if (encoder) {
      try {
        encoder.close();
      } catch {
        // ignore double-close
      }
      encoder = null;
    }
    if (pendingEncode) {
      pendingEncode.reject(new Error("Video encoder closed"));
      pendingEncode = null;
    }
  }

  async function ensureEncoder(next: VideoProcessOptions) {
    if (typeof VideoEncoder === "undefined") {
      throw new Error("WebCodecs VideoEncoder is not available");
    }
    if (!next.codec) {
      throw new Error("Video encode mode requires a codec");
    }
    if (
      next.width === undefined ||
      next.height === undefined ||
      next.width <= 0 ||
      next.height <= 0
    ) {
      throw new Error("Video encode mode requires positive width and height");
    }

    const config: VideoEncoderConfig = {
      codec: next.codec,
      width: next.width,
      height: next.height,
      bitrate: next.bitrate ?? 1_000_000,
      framerate: next.framerate ?? 30,
    };

    const support = await VideoEncoder.isConfigSupported(config);
    if (!support.supported) {
      throw new Error(
        `VideoEncoder config is unsupported for codec ${next.codec}`,
      );
    }

    closeEncoder();
    encoder = new VideoEncoder({
      output(chunk) {
        const data = new ArrayBuffer(chunk.byteLength);
        chunk.copyTo(data);
        const result: VideoProcessResult = {
          width: next.width ?? 0,
          height: next.height ?? 0,
          timestamp: chunk.timestamp,
          encoded: {
            byteLength: chunk.byteLength,
            type: chunk.type,
            timestamp: chunk.timestamp,
            duration: chunk.duration,
            data,
          },
        };
        pendingEncode?.resolve(result);
        pendingEncode = null;
      },
      error(error) {
        pendingEncode?.reject(
          error instanceof Error ? error : new Error(String(error)),
        );
        pendingEncode = null;
      },
    });
    encoder.configure(support.config ?? config);
  }

  return {
    async configure(nextOptions) {
      assertActive();
      await overrides.configure?.(nextOptions);
      assertActive();

      const mode = nextOptions.mode ?? "summary";
      if (mode === "encode") {
        if (overrides.encode) {
          options = nextOptions;
          return;
        }
        await ensureEncoder(nextOptions);
        assertActive();
      } else {
        closeEncoder();
      }

      options = nextOptions;
    },

    async processFrame(job) {
      assertActive();

      if (options === null) {
        throw new Error(
          "Video worker must be configured before processing frames",
        );
      }

      const frame = job.frame;
      try {
        const mode = options.mode ?? "summary";
        let result: VideoProcessResult;

        if (mode === "encode") {
          if (overrides.encode) {
            result = await overrides.encode(frame, options);
          } else {
            if (!encoder) {
              throw new Error("Video encoder is not configured");
            }
            result = await new Promise<VideoProcessResult>(
              (resolve, reject) => {
                pendingEncode = { resolve, reject };
                try {
                  encoder?.encode(frame);
                  void encoder?.flush().catch((error: unknown) => {
                    pendingEncode?.reject(
                      error instanceof Error ? error : new Error(String(error)),
                    );
                    pendingEncode = null;
                  });
                } catch (error) {
                  pendingEncode = null;
                  reject(
                    error instanceof Error ? error : new Error(String(error)),
                  );
                }
              },
            );
          }
        } else {
          result =
            overrides.summarize?.(frame) ??
            summarizeFrame(frame, job.timestamp);
        }

        for (const subscriber of subscribers) {
          await subscriber(result);
        }

        return result;
      } finally {
        try {
          frame.close();
        } catch {
          // frame may already be closed after transfer edge cases
        }
      }
    },

    async subscribe(onResult) {
      assertActive();
      subscribers.add(onResult);
    },

    async dispose() {
      isDisposed = true;
      options = null;
      subscribers.clear();
      closeEncoder();
    },
  };
}

function summarizeFrame(
  frame: VideoFrame,
  timestamp?: number,
): VideoProcessResult {
  return {
    width: frame.displayWidth || frame.codedWidth,
    height: frame.displayHeight || frame.codedHeight,
    timestamp: timestamp ?? frame.timestamp,
    format: frame.format,
    codedWidth: frame.codedWidth,
    codedHeight: frame.codedHeight,
  };
}
