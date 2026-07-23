import type { AudioProcessResult } from "../audio";
import { calculateAudioLevels } from "./levels";

const DEFAULT_METRIC_INTERVAL_SECONDS = 1 / 30;

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;
}

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor,
): void;

declare const currentTime: number;

class LevelMeterProcessor extends AudioWorkletProcessor {
  #lastMetricTime = -Infinity;

  process(inputs: Float32Array[][]): boolean {
    if (currentTime - this.#lastMetricTime >= DEFAULT_METRIC_INTERVAL_SECONDS) {
      this.#lastMetricTime = currentTime;
      const levels = calculateAudioLevels(inputs);
      const result: AudioProcessResult = {
        ...levels,
        timestamp: currentTime,
      };
      this.port.postMessage(result);
    }

    return true;
  }
}

registerProcessor("react-user-media-level-meter", LevelMeterProcessor);
