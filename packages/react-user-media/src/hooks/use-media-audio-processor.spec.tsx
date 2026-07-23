import "@testing-library/jest-dom";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@vitest/browser/context";
import { afterEach, expect, test, vi } from "vitest";
import levelMeterWorkletUrl from "../audio-worklet/level-meter.ts?url";
import { useMediaAudioProcessor } from "./use-media-audio-processor";

class MockPort extends EventTarget {
  readonly messages: unknown[] = [];
  closed = false;
  onmessage: ((event: MessageEvent) => void) | null = null;

  postMessage(message: unknown) {
    this.messages.push(message);
  }

  close() {
    this.closed = true;
  }

  emit(message: unknown) {
    this.onmessage?.(new MessageEvent("message", { data: message }));
  }
}

class MockNode {
  readonly port = new MockPort();
  disconnected = false;

  connect = vi.fn();

  disconnect = vi.fn(() => {
    this.disconnected = true;
  });
}

class MockAudioContext {
  readonly audioWorklet = {
    addModule: vi.fn<() => Promise<void>>().mockResolvedValue(),
  };
  readonly destination = new MockNode();
  readonly source = new MockNode();
  readonly gain = new MockNode() as MockNode & { gain: { value: number } };
  close = vi.fn<() => Promise<void>>().mockResolvedValue();
  resume = vi.fn<() => Promise<void>>().mockResolvedValue();

  constructor() {
    this.gain.gain = { value: 1 };
  }

  createMediaStreamSource = vi.fn(() => this.source);
  createGain = vi.fn(() => this.gain);
}

function AudioProcessorHarness({
  media,
  context,
  workletModuleUrl = "https://example.test/level-meter.js",
}: {
  media: MediaStream;
  context: MockAudioContext | AudioContext;
  workletModuleUrl?: string;
}) {
  const processor = useMediaAudioProcessor({
    strategy: "worklet",
    createAudioContext: () => context as unknown as AudioContext,
    workletModuleUrl,
  });

  return (
    <>
      <button onClick={() => processor.start(media)}>start</button>
      <button onClick={() => processor.stop()}>stop</button>
      <output data-testid="state">
        {processor.isError
          ? "error"
          : processor.isLoading
            ? "loading"
            : processor.isReady
              ? "ready"
              : "idle"}
      </output>
      <output data-testid="rms">{processor.result?.rms ?? "none"}</output>
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("reports a module-loading failure as an error", async () => {
  const context = new MockAudioContext();
  context.audioWorklet.addModule.mockRejectedValueOnce(
    new Error("module failed"),
  );
  vi.stubGlobal("AudioWorkletNode", MockNode);

  render(<AudioProcessorHarness context={context} media={new MediaStream()} />);

  await act(async () => {
    screen.getByRole("button", { name: "start" }).click();
  });

  await waitFor(() => {
    expect(screen.getByTestId("state")).toHaveTextContent("error");
  });
  expect(context.close).toHaveBeenCalledOnce();
});

test("tears down the graph without stopping supplied tracks", async () => {
  const context = new MockAudioContext();
  const stop = vi.fn();
  const media = {
    getTracks: () => [{ stop }],
  } as unknown as MediaStream;
  vi.stubGlobal("AudioWorkletNode", MockNode);

  render(<AudioProcessorHarness context={context} media={media} />);

  await act(async () => {
    screen.getByRole("button", { name: "start" }).click();
  });
  await waitFor(() => {
    expect(screen.getByTestId("state")).toHaveTextContent("ready");
  });

  await act(async () => {
    screen.getByRole("button", { name: "stop" }).click();
  });

  expect(context.source.disconnect).toHaveBeenCalledOnce();
  expect(context.gain.disconnect).toHaveBeenCalledOnce();
  expect(context.close).toHaveBeenCalledOnce();
  expect(stop).not.toHaveBeenCalled();
});

test("exposes worklet level messages while its session is current", async () => {
  const context = new MockAudioContext();
  vi.stubGlobal("AudioWorkletNode", MockNode);

  render(<AudioProcessorHarness context={context} media={new MediaStream()} />);

  await act(async () => {
    screen.getByRole("button", { name: "start" }).click();
  });
  await waitFor(() => {
    expect(screen.getByTestId("state")).toHaveTextContent("ready");
  });

  await act(async () => {
    context.source.connect.mock.calls[0]?.[0].port.emit({
      rms: 0.25,
      peak: 0.5,
      timestamp: 1,
    });
  });

  expect(screen.getByTestId("rms")).toHaveTextContent("0.25");
});

test("tears down an active session when unmounted without stopping tracks", async () => {
  const context = new MockAudioContext();
  const stop = vi.fn();
  const media = {
    getTracks: () => [{ stop }],
  } as unknown as MediaStream;
  vi.stubGlobal("AudioWorkletNode", MockNode);

  const view = render(
    <AudioProcessorHarness context={context} media={media} />,
  );

  await act(async () => {
    screen.getByRole("button", { name: "start" }).click();
  });
  await waitFor(() => {
    expect(screen.getByTestId("state")).toHaveTextContent("ready");
  });

  const processor = context.source.connect.mock.calls[0]?.[0] as MockNode;
  view.unmount();

  expect(context.source.disconnect).toHaveBeenCalledOnce();
  expect(processor.disconnect).toHaveBeenCalledOnce();
  expect(context.gain.disconnect).toHaveBeenCalledOnce();
  expect(processor.port.closed).toBe(true);
  expect(processor.port.onmessage).toBeNull();
  expect(context.close).toHaveBeenCalledOnce();
  expect(stop).not.toHaveBeenCalled();
});

test("reports non-silent levels from a live synthetic audio graph", async () => {
  const inputContext = new AudioContext();
  const processorContext = new AudioContext();
  const oscillator = inputContext.createOscillator();
  const destination = inputContext.createMediaStreamDestination();
  const source = processorContext.createMediaStreamSource(destination.stream);
  oscillator.frequency.value = 440;
  oscillator.connect(destination);
  oscillator.start();

  await processorContext.audioWorklet.addModule(levelMeterWorkletUrl);
  const processor = new AudioWorkletNode(
    processorContext,
    "react-user-media-level-meter",
  );
  const silentGain = processorContext.createGain();
  silentGain.gain.value = 0;
  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(processorContext.destination);

  const message = new Promise<{ rms: number; peak: number }>((resolve) => {
    processor.port.onmessage = (event) => {
      const levels = event.data as { rms: number; peak: number };
      if (levels.rms > 0 && levels.peak > 0) {
        resolve(levels);
      }
    };
  });

  render(<button>Activate audio</button>);
  await userEvent.click(screen.getByRole("button", { name: "Activate audio" }));
  await Promise.all([inputContext.resume(), processorContext.resume()]);

  const levels = await message;

  expect(levels.rms).toBeGreaterThan(0);
  expect(levels.peak).toBeGreaterThan(0);

  oscillator.stop();
  await inputContext.close();
  await processorContext.close();
});
