import type { VideoProcessResult } from "../../video";
import { summarizeVideoFrame } from "../../video-track-processor/summary";

export type VideoTrackRpcOptions = {
  metricIntervalMs?: number;
};

export type VideoTrackRpcApi = {
  configure(options: VideoTrackRpcOptions): Promise<void>;
  subscribe(onResult: (result: VideoProcessResult) => void): Promise<void>;
  dispose(): Promise<void>;
};

/**
 * Synchronous frame-handling state for the track-rpc strategy.
 *
 * Public methods are async for Comlink. `handleFrame` stays synchronous and
 * must not await Comlink.
 */
export class TrackRpcController implements VideoTrackRpcApi {
  #disposed = false;
  #metricIntervalMs = 1000 / 30;
  #lastPostedAt = 0;
  #subscriptions = new Set<(result: VideoProcessResult) => void>();

  async configure(options: VideoTrackRpcOptions): Promise<void> {
    this.#assertActive();
    if (
      options.metricIntervalMs !== undefined &&
      Number.isFinite(options.metricIntervalMs) &&
      options.metricIntervalMs > 0
    ) {
      this.#metricIntervalMs = options.metricIntervalMs;
    }
  }

  async subscribe(
    onResult: (result: VideoProcessResult) => void,
  ): Promise<void> {
    this.#assertActive();
    this.#subscriptions.add(onResult);
  }

  async dispose(): Promise<void> {
    this.#disposed = true;
    this.#subscriptions.clear();
  }

  /**
   * Handle one input frame synchronously. Closes the frame before returning.
   */
  handleFrame(frame: VideoFrame): boolean {
    if (this.#disposed) {
      try {
        frame.close();
      } catch {
        // ignore
      }
      return false;
    }

    try {
      const now = performance.now();
      if (now - this.#lastPostedAt >= this.#metricIntervalMs) {
        this.#lastPostedAt = now;
        const result = summarizeVideoFrame(frame);
        for (const subscription of this.#subscriptions) {
          subscription(result);
        }
      }
    } finally {
      frame.close();
    }

    return true;
  }

  #assertActive(): void {
    if (this.#disposed) {
      throw new Error("Video track RPC session is disposed");
    }
  }
}

export type { VideoProcessResult };
