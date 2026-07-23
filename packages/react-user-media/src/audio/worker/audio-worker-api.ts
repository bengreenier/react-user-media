import type {
  AudioFrame,
  AudioProcessOptions,
  AudioProcessResult,
  AudioProcessSubscriber,
  AudioWorkerApi,
} from "../types";

export interface AudioWorkerApiOverrides {
  configure?: (options: AudioProcessOptions) => void | Promise<void>;
}

/**
 * Creates the audio-only job API exposed by the Dedicated Worker.
 *
 * Keeping PCM analysis behind this narrow API allows future media job kinds to
 * reuse the lifecycle and transfer model without changing this contract.
 */
export function createAudioWorkerApi(
  overrides: AudioWorkerApiOverrides = {},
): AudioWorkerApi {
  let isDisposed = false;
  let options: AudioProcessOptions | null = null;
  const subscribers = new Set<AudioProcessSubscriber>();

  function assertActive() {
    if (isDisposed) {
      throw new Error("Audio worker has been disposed");
    }
  }

  return {
    async configure(nextOptions) {
      assertActive();

      if (
        !Number.isFinite(nextOptions.sampleRate) ||
        nextOptions.sampleRate <= 0
      ) {
        throw new Error("Audio worker requires a positive sampleRate");
      }

      await overrides.configure?.(nextOptions);
      assertActive();
      options = nextOptions;
    },

    async processFrame(frame) {
      assertActive();

      if (options === null) {
        throw new Error(
          "Audio worker must be configured before processing frames",
        );
      }

      if (frame.sampleRate !== options.sampleRate) {
        throw new Error(
          "Audio frame sampleRate does not match worker configuration",
        );
      }

      const result = calculateLevels(frame);

      for (const subscriber of subscribers) {
        await subscriber(result);
      }

      return result;
    },

    async subscribe(onResult) {
      assertActive();
      subscribers.add(onResult);
    },

    async dispose() {
      isDisposed = true;
      options = null;
      subscribers.clear();
    },
  };
}

function calculateLevels(frame: AudioFrame): AudioProcessResult {
  let peak = 0;
  let sumOfSquares = 0;
  let sampleCount = 0;

  for (const channel of frame.channelData) {
    for (const sample of channel) {
      const amplitude = Math.abs(sample);
      peak = Math.max(peak, amplitude);
      sumOfSquares += sample * sample;
      sampleCount += 1;
    }
  }

  return {
    frameLength: frame.channelData[0]?.length ?? 0,
    peak,
    rms: sampleCount === 0 ? 0 : Math.sqrt(sumOfSquares / sampleCount),
    timestamp: frame.timestamp,
  };
}
