import { expose } from "comlink";
import { describe, expect, test, vi } from "vitest";
import { WorkletRpcController } from "./controller";
import { createAudioWorkletRpcSession } from "./index";

describe("createAudioWorkletRpcSession", () => {
  test("wires a Comlink control port and tears down without touching stream tracks", async () => {
    const channel = new MessageChannel();
    const controller = new WorkletRpcController();
    expose(controller, channel.port1);
    const source = { connect: vi.fn(), disconnect: vi.fn() };
    const node = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      port: channel.port2,
    };
    const silentGain = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: { value: 1 },
    };
    const context = {
      audioWorklet: { addModule: vi.fn().mockResolvedValue(undefined) },
      close: vi.fn().mockResolvedValue(undefined),
      createGain: vi.fn(() => silentGain),
      createMediaStreamSource: vi.fn(() => source),
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
    };
    const stream = { getTracks: vi.fn() } as unknown as MediaStream;

    const session = await createAudioWorkletRpcSession(stream, {
      audioContext: context as unknown as AudioContext,
      createWorkletNode: () => node as unknown as AudioWorkletNode,
      workletModuleUrl: "worklet-rpc-test.js",
    });
    await session.api.configure({ passthrough: false });
    const outputs = [[new Float32Array([99])]];
    controller.process([[new Float32Array([1])]], outputs, 1);

    expect(outputs[0]?.[0]).toEqual(new Float32Array([0]));
    await session.dispose();

    expect(context.audioWorklet.addModule).toHaveBeenCalledWith(
      "worklet-rpc-test.js",
    );
    expect(context.resume).toHaveBeenCalledOnce();
    expect(source.disconnect).toHaveBeenCalledOnce();
    expect(node.disconnect).toHaveBeenCalledOnce();
    expect(silentGain.disconnect).toHaveBeenCalledOnce();
    expect(context.close).not.toHaveBeenCalled();
    expect(stream.getTracks).not.toHaveBeenCalled();
  });
});
