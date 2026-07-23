import * as Comlink from "comlink";
import { expect, test, vi } from "vitest";
import { createVideoStreamWorkerBridge } from "./stream-bridge";
import type { VideoWorkerApi } from "./types";
import { createVideoWorkerApi } from "./worker/video-worker-api";

test("stream bridge stop does not stop tracks", async () => {
  const trackStop = vi.fn();
  const media = {
    getVideoTracks: () => [
      { kind: "video", readyState: "live", stop: trackStop },
    ],
  } as unknown as MediaStream;

  const channel = new MessageChannel();
  Comlink.expose(createVideoWorkerApi(), channel.port1);
  const api = Comlink.wrap<VideoWorkerApi>(channel.port2);
  await api.configure({ mode: "summary" });

  const bridge = await createVideoStreamWorkerBridge(media, api, {
    createReadable: () =>
      new ReadableStream<VideoFrame>({
        start(controller) {
          controller.close();
        },
      }),
  });

  bridge.stop();
  expect(trackStop).not.toHaveBeenCalled();

  await api.dispose();
  api[Comlink.releaseProxy]();
  channel.port1.close();
  channel.port2.close();
});
