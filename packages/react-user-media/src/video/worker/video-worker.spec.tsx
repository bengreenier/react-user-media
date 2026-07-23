import "@testing-library/jest-dom";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import * as Comlink from "comlink";
import { useEffect } from "react";
import { afterEach, expect, test, vi } from "vitest";
import type { VideoWorkerApi } from "../types";
import { useVideoWorker } from "../use-video-worker";
import { createVideoWorkerApi } from "./video-worker-api";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function createFakeFrame(partial: {
  width: number;
  height: number;
  timestamp: number;
}): VideoFrame {
  const closed = { value: false };
  return {
    displayWidth: partial.width,
    displayHeight: partial.height,
    codedWidth: partial.width,
    codedHeight: partial.height,
    timestamp: partial.timestamp,
    format: "RGBA",
    close() {
      closed.value = true;
    },
    get closed() {
      return closed.value;
    },
  } as unknown as VideoFrame;
}

function createEndpoint(api: VideoWorkerApi) {
  const channel = new MessageChannel();
  Comlink.expose(api, channel.port1);
  const terminate = vi.fn(() => channel.port2.close());

  return {
    worker: Object.assign(channel.port2, { terminate }) as unknown as Worker,
    terminate,
  };
}

function WorkerTestComponent({ createWorker }: { createWorker: () => Worker }) {
  const { api, error, isError, isIdle, isLoading, isReady, start, stop } =
    useVideoWorker({ createWorker });

  const state = isReady
    ? "ready"
    : isLoading
      ? "loading"
      : isError
        ? "error"
        : "idle";

  return (
    <>
      <button onClick={() => start()}>Start</button>
      <button onClick={() => stop()}>Stop</button>
      <p data-testid="state">{state}</p>
      <p data-testid="api">{api ? "available" : "none"}</p>
      <p data-testid="error">{error?.message ?? "none"}</p>
      <p data-testid="idle">{String(isIdle)}</p>
    </>
  );
}

test("summarizes a frame and closes it after the job", async () => {
  const api = createVideoWorkerApi();
  await api.configure({ mode: "summary" });
  const frame = createFakeFrame({ width: 128, height: 72, timestamp: 9 });

  const result = await api.processFrame({ frame, timestamp: 9 });

  expect(result).toMatchObject({
    width: 128,
    height: 72,
    timestamp: 9,
    format: "RGBA",
  });
  expect((frame as unknown as { closed: boolean }).closed).toBe(true);

  await api.dispose();
  await expect(
    api.processFrame({
      frame: createFakeFrame({ width: 1, height: 1, timestamp: 0 }),
    }),
  ).rejects.toThrow("disposed");
});

test("delivers results to subscribers", async () => {
  const api = createVideoWorkerApi();
  const onResult = vi.fn();

  await api.configure({ mode: "summary" });
  await api.subscribe(onResult);

  const result = await api.processFrame({
    frame: createFakeFrame({ width: 10, height: 20, timestamp: 1 }),
  });

  expect(result.width).toBe(10);
  expect(onResult).toHaveBeenCalledWith(result);

  await api.dispose();
  expect(onResult).toHaveBeenCalledOnce();
});

test("Comlink proxy reaches ready via createWorker override", async () => {
  const { worker } = createEndpoint(createVideoWorkerApi());
  const api = Comlink.wrap<VideoWorkerApi>(worker);

  await api.configure({ mode: "summary" });
  await api.dispose();
  api[Comlink.releaseProxy]();
  worker.terminate();
});

test("encode mode fails closed when VideoEncoder is missing", async () => {
  const original = globalThis.VideoEncoder;
  // @ts-expect-error intentional delete for capability test
  delete globalThis.VideoEncoder;

  const api = createVideoWorkerApi();
  await expect(
    api.configure({
      mode: "encode",
      codec: "vp8",
      width: 320,
      height: 240,
    }),
  ).rejects.toThrow("VideoEncoder is not available");

  globalThis.VideoEncoder = original;
});

test("releases the proxy and terminates a custom worker on stop", async () => {
  const { worker, terminate } = createEndpoint(createVideoWorkerApi());

  render(<WorkerTestComponent createWorker={() => worker} />);

  act(() => {
    screen.getByText("Start").click();
  });

  await waitFor(() => {
    expect(screen.getByTestId("state")).toHaveTextContent("ready");
    expect(screen.getByTestId("api")).toHaveTextContent("available");
  });

  act(() => {
    screen.getByText("Stop").click();
  });

  expect(terminate).toHaveBeenCalledOnce();
  expect(screen.getByTestId("state")).toHaveTextContent("idle");
});

test("ignores late configure results after restart", async () => {
  let resolveFirst!: () => void;
  const firstConfigure = new Promise<void>((resolve) => {
    resolveFirst = resolve;
  });

  let call = 0;
  const createWorker = () => {
    call += 1;
    if (call === 1) {
      return createEndpoint(
        createVideoWorkerApi({
          configure: async () => {
            await firstConfigure;
          },
        }),
      ).worker;
    }
    return createEndpoint(createVideoWorkerApi()).worker;
  };

  const states: string[] = [];
  function Harness() {
    const worker = useVideoWorker({ createWorker });
    useEffect(() => {
      states.push(
        worker.isReady
          ? "ready"
          : worker.isLoading
            ? "loading"
            : worker.isError
              ? "error"
              : "idle",
      );
    }, [worker.isError, worker.isLoading, worker.isReady]);
    return <button onClick={() => worker.start()}>Start</button>;
  }

  render(<Harness />);

  act(() => {
    screen.getByText("Start").click();
  });

  act(() => {
    screen.getByText("Start").click();
  });

  await waitFor(() => {
    expect(states.includes("ready")).toBe(true);
  });

  resolveFirst();
  await act(async () => {
    await Promise.resolve();
  });

  expect(states.at(-1)).toBe("ready");
});
