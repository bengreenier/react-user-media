import { WorkletRpcController } from "./controller";
import { exposeWorkletRpc } from "./port";

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;
  abstract process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processor: typeof AudioWorkletProcessor,
): void;

declare const currentTime: number;

class AudioWorkletRpcProcessor extends AudioWorkletProcessor {
  #controller = new WorkletRpcController();

  constructor() {
    super();
    exposeWorkletRpc(this.#controller, this.port);
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    return this.#controller.process(inputs, outputs, currentTime);
  }
}

registerProcessor("react-user-media-worklet-rpc", AudioWorkletRpcProcessor);
