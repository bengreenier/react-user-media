import { describe, expect, test, vi } from "vitest";
import { WorkletRpcController } from "./controller";

describe("WorkletRpcController", () => {
  test("applies configure synchronously to subsequent process calls", async () => {
    const controller = new WorkletRpcController();

    await controller.configure({ passthrough: false });
    const outputs = [[new Float32Array([99, 99])]];

    expect(controller.process([[new Float32Array([3, 4])]], outputs)).toBe(
      true,
    );
    expect(outputs[0]?.[0]).toEqual(new Float32Array([0, 0]));
  });

  test("sends level results to subscribed callbacks", async () => {
    const controller = new WorkletRpcController();
    const onResult = vi.fn();

    await controller.subscribe(onResult);
    controller.process([[new Float32Array([3, 4])]], [[new Float32Array(2)]]);

    expect(onResult).toHaveBeenCalledWith({
      rms: Math.sqrt(12.5),
      peak: 4,
    });
  });

  test("fails closed after disposal", async () => {
    const controller = new WorkletRpcController();
    const onResult = vi.fn();

    await controller.subscribe(onResult);
    await controller.dispose();

    await expect(controller.configure({})).rejects.toThrow("disposed");
    await expect(controller.subscribe(onResult)).rejects.toThrow("disposed");
    controller.process([[new Float32Array([1])]], [[new Float32Array(1)]]);
    expect(onResult).not.toHaveBeenCalled();
  });
});
