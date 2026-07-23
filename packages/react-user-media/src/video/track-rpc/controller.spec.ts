import * as Comlink from "comlink";
import { expect, test, vi } from "vitest";
import { TrackRpcController } from "./controller";
import { exposeTrackRpc } from "./port";
import { createVideoTrackRpcSession } from "./session";

test("handleFrame closes frames and notifies subscribers without awaiting", async () => {
  const controller = new TrackRpcController();
  await controller.configure({ metricIntervalMs: 1 });
  const onResult = vi.fn();
  await controller.subscribe(onResult);

  const closed = { value: false };
  const frame = {
    displayWidth: 64,
    displayHeight: 48,
    codedWidth: 64,
    codedHeight: 48,
    timestamp: 7,
    format: "RGBA",
    close() {
      closed.value = true;
    },
  } as unknown as VideoFrame;

  expect(controller.handleFrame(frame)).toBe(true);
  expect(closed.value).toBe(true);
  expect(onResult).toHaveBeenCalledWith(
    expect.objectContaining({ width: 64, height: 48, timestamp: 7 }),
  );

  await controller.dispose();
  await expect(controller.configure({})).rejects.toThrow("disposed");
});

test("Comlink port configure and subscribe work across MessageChannel", async () => {
  const controller = new TrackRpcController();
  const channel = new MessageChannel();
  exposeTrackRpc(controller, channel.port1);
  const api = Comlink.wrap<typeof controller>(channel.port2);

  await api.configure({ metricIntervalMs: 1 });
  const onResult = vi.fn();
  await api.subscribe(Comlink.proxy(onResult));

  controller.handleFrame({
    displayWidth: 10,
    displayHeight: 10,
    codedWidth: 10,
    codedHeight: 10,
    timestamp: 1,
    format: "RGBA",
    close() {},
  } as unknown as VideoFrame);

  await vi.waitFor(() => {
    expect(onResult).toHaveBeenCalled();
  });

  await api.dispose();
  api[Comlink.releaseProxy]();
  channel.port1.close();
  channel.port2.close();
});

test("session dispose tears down without stopping tracks", async () => {
  const trackStop = vi.fn();
  const pipelineStop = vi.fn();
  const media = {
    getVideoTracks: () => [
      { kind: "video", readyState: "live", stop: trackStop },
    ],
  } as unknown as MediaStream;

  const session = await createVideoTrackRpcSession(media, {
    createPipeline: async (_track, { onFrame }) => {
      queueMicrotask(() => {
        onFrame({
          displayWidth: 8,
          displayHeight: 8,
          codedWidth: 8,
          codedHeight: 8,
          timestamp: 2,
          format: "RGBA",
          close() {},
        } as unknown as VideoFrame);
      });
      return { stop: pipelineStop };
    },
  });

  await session.api.configure({ metricIntervalMs: 1 });
  await session.dispose();

  expect(pipelineStop).toHaveBeenCalledOnce();
  expect(trackStop).not.toHaveBeenCalled();
});
