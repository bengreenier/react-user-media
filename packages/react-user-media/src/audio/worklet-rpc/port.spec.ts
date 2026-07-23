import { proxy, releaseProxy, wrap } from "comlink";
import { describe, expect, test, vi } from "vitest";
import type { AudioWorkletRpcApi } from "./controller";
import { WorkletRpcController } from "./controller";
import { exposeWorkletRpc } from "./port";

describe("exposeWorkletRpc", () => {
  test("configures and subscribes through a Comlink MessagePort proxy", async () => {
    const channel = new MessageChannel();
    const controller = new WorkletRpcController();
    exposeWorkletRpc(controller, channel.port1);
    const api = wrap<AudioWorkletRpcApi>(channel.port2);
    const onResult = vi.fn();

    await api.configure({ passthrough: false });
    await api.subscribe(proxy(onResult));
    const outputs = [[new Float32Array([99, 99])]];
    controller.process([[new Float32Array([3, 4])]], outputs, 12.5);

    expect(outputs[0]?.[0]).toEqual(new Float32Array([0, 0]));
    await vi.waitFor(() =>
      expect(onResult).toHaveBeenCalledWith({
        rms: Math.sqrt(12.5),
        peak: 4,
        timestamp: 12.5,
      }),
    );
    api[releaseProxy]();
  });
});
