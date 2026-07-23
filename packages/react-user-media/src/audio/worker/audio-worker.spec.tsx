import "@testing-library/jest-dom";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import * as Comlink from "comlink";
import { afterEach, expect, test, vi } from "vitest";
import type { AudioWorkerApi } from "../types";
import { useAudioWorker } from "../use-audio-worker";
import { createAudioWorkerApi } from "./audio-worker-api";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function createEndpoint(api: AudioWorkerApi) {
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
    useAudioWorker({ createWorker });

  return (
    <>
      <button onClick={() => start()}>Start</button>
      <button onClick={() => stop()}>Stop</button>
      <p data-testid="state">
        {isReady ? "ready" : isLoading ? "loading" : isError ? "error" : "idle"}
      </p>
      <p data-testid="api">{api ? "available" : "none"}</p>
      <p data-testid="error">{error?.message ?? "none"}</p>
      <p data-testid="idle">{String(isIdle)}</p>
    </>
  );
}

test("computes RMS and peak and notifies proxied subscribers", async () => {
  const api = createAudioWorkerApi();
  const onResult = vi.fn();

  await api.configure({ sampleRate: 48_000 });
  await api.subscribe(onResult);

  const result = await api.processFrame({
    channelData: [new Float32Array([0.5, -0.5])],
    sampleRate: 48_000,
  });

  expect(result).toMatchObject({ peak: 0.5, rms: 0.5, frameLength: 2 });
  expect(onResult).toHaveBeenCalledWith(result);
});

test("fails closed after dispose", async () => {
  const api = createAudioWorkerApi();
  await api.configure({ sampleRate: 48_000 });
  await api.dispose();

  await expect(
    api.processFrame({
      channelData: [new Float32Array([0.5])],
      sampleRate: 48_000,
    }),
  ).rejects.toThrow("disposed");
});

test("processes a transferred PCM buffer through a Comlink proxy", async () => {
  const { worker } = createEndpoint(createAudioWorkerApi());
  const api = Comlink.wrap<AudioWorkerApi>(worker);
  const samples = new Float32Array([0.25, -0.25]);
  const frame = {
    channelData: [samples],
    sampleRate: 48_000,
  };

  await api.configure({ sampleRate: 48_000 });
  const result = await api.processFrame(
    Comlink.transfer(frame, [samples.buffer]),
  );

  expect(result).toMatchObject({ peak: 0.25, rms: 0.25, frameLength: 2 });
  expect(samples.byteLength).toBe(0);

  api[Comlink.releaseProxy]();
  worker.terminate();
});

test("releases the proxy and terminates a custom worker on stop", async () => {
  const { worker, terminate } = createEndpoint(createAudioWorkerApi());

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
  expect(screen.getByTestId("api")).toHaveTextContent("none");
});

test("reports worker initialization failures without leaking a worker", async () => {
  const createWorker = vi.fn(() => {
    throw new Error("worker unavailable");
  });

  render(<WorkerTestComponent createWorker={createWorker} />);

  act(() => {
    screen.getByText("Start").click();
  });

  await waitFor(() => {
    expect(screen.getByTestId("state")).toHaveTextContent("error");
    expect(screen.getByTestId("error")).toHaveTextContent("worker unavailable");
  });
  expect(screen.getByTestId("api")).toHaveTextContent("none");
});

test("ignores a previous worker session that completes after restart", async () => {
  let resolveFirstConfigure!: () => void;
  const firstConfigure = new Promise<void>((resolve) => {
    resolveFirstConfigure = resolve;
  });
  const firstApi = createAudioWorkerApi({
    configure: () => firstConfigure,
  });
  const secondApi = createAudioWorkerApi();
  const first = createEndpoint(firstApi);
  const second = createEndpoint(secondApi);
  const workers = [first.worker, second.worker];

  render(
    <WorkerTestComponent
      createWorker={() => {
        const worker = workers.shift();
        if (!worker) {
          throw new Error("unexpected worker");
        }
        return worker;
      }}
    />,
  );

  act(() => {
    screen.getByText("Start").click();
    screen.getByText("Start").click();
  });

  await waitFor(() => {
    expect(screen.getByTestId("state")).toHaveTextContent("ready");
  });

  await act(async () => {
    resolveFirstConfigure();
    await firstConfigure;
  });

  expect(screen.getByTestId("state")).toHaveTextContent("ready");
  expect(first.terminate).toHaveBeenCalledOnce();
});
