import type { AudioProcessResult } from "./types";

export type AudioWorkletRpcOptions = {
  passthrough?: boolean;
};

export type { AudioProcessResult } from "./types";

export type AudioWorkletRpcApi = {
  configure(options: AudioWorkletRpcOptions): Promise<void>;
  subscribe(onResult: (result: AudioProcessResult) => void): Promise<void>;
  dispose(): Promise<void>;
};

/**
 * Synchronous DSP state owned by the AudioWorkletProcessor.
 *
 * The public methods are async only because Comlink serializes calls as
 * promises. `process` deliberately remains synchronous.
 */
export class WorkletRpcController implements AudioWorkletRpcApi {
  #disposed = false;
  #passthrough = true;
  #subscriptions = new Set<(result: AudioProcessResult) => void>();

  async configure(options: AudioWorkletRpcOptions): Promise<void> {
    this.#assertActive();
    this.#passthrough = options.passthrough ?? true;
  }

  async subscribe(
    onResult: (result: AudioProcessResult) => void,
  ): Promise<void> {
    this.#assertActive();
    this.#subscriptions.add(onResult);
  }

  async dispose(): Promise<void> {
    this.#disposed = true;
    this.#subscriptions.clear();
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    timestamp: number,
  ): boolean {
    if (this.#disposed) {
      return false;
    }

    const samples = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!samples) {
      return true;
    }

    let sumSquares = 0;
    let peak = 0;
    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index] ?? 0;
      sumSquares += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
      if (output) {
        output[index] = this.#passthrough ? sample : 0;
      }
    }

    const result = {
      rms: Math.sqrt(sumSquares / samples.length),
      peak,
      timestamp,
    };
    for (const subscription of this.#subscriptions) {
      subscription(result);
    }

    return true;
  }

  #assertActive(): void {
    if (this.#disposed) {
      throw new Error("AudioWorklet RPC session is disposed");
    }
  }
}
