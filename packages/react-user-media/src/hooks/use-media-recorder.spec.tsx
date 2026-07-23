import "@testing-library/jest-dom";
import { userEvent } from "@vitest/browser/context";
import { render, screen, act, cleanup, waitFor } from "@testing-library/react";
import { useMedia, useMediaRecorder, VideoPlayer } from "../";

const mockStream = new MediaStream();

class MockMediaRecorder extends EventTarget {
  static instances: MockMediaRecorder[] = [];
  static throwOnConstruct: Error | null = null;
  static throwOnStart: Error | null = null;

  readonly startCalls: unknown[][] = [];
  readonly listenerCounts = new Map<string, number>();
  readonly media: MediaStream;
  readonly options?: MediaRecorderOptions;
  state: RecordingState = "inactive";
  stopCalls = 0;

  constructor(media: MediaStream, options?: MediaRecorderOptions) {
    super();

    if (MockMediaRecorder.throwOnConstruct) {
      throw MockMediaRecorder.throwOnConstruct;
    }

    this.media = media;
    this.options = options;
    MockMediaRecorder.instances.push(this);
  }

  override addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean,
  ) {
    this.listenerCounts.set(type, (this.listenerCounts.get(type) ?? 0) + 1);
    super.addEventListener(type, callback, options);
  }

  override removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean,
  ) {
    this.listenerCounts.set(
      type,
      Math.max((this.listenerCounts.get(type) ?? 0) - 1, 0),
    );
    super.removeEventListener(type, callback, options);
  }

  start(...args: unknown[]) {
    if (MockMediaRecorder.throwOnStart) {
      throw MockMediaRecorder.throwOnStart;
    }

    this.startCalls.push(args);
    this.state = "recording";
    this.dispatchEvent(new Event("start"));
  }

  stop() {
    if (this.state === "inactive") {
      return;
    }

    this.stopCalls += 1;
    this.state = "inactive";
    this.dispatchEvent(new Event("stop"));
  }

  pause() {
    if (this.state !== "recording") {
      return;
    }

    this.state = "paused";
    this.dispatchEvent(new Event("pause"));
  }

  resume() {
    if (this.state !== "paused") {
      return;
    }

    this.state = "recording";
    this.dispatchEvent(new Event("resume"));
  }

  dispatchData(data: Blob) {
    this.dispatchEvent(new BlobEvent("dataavailable", { data }));
  }

  dispatchRecorderError(error?: Error) {
    const event = new Event("error") as Event & { error?: Error };
    if (error) {
      event.error = error;
    }
    this.dispatchEvent(event);
  }
}

function RecorderLifecycleTestComponent() {
  const recorder = useMediaRecorder();

  return (
    <>
      <button onClick={() => act(() => recorder.startRecording(mockStream))}>
        Start
      </button>
      <button
        onClick={() =>
          act(() => recorder.startRecording(mockStream, { timeslice: 250 }))
        }
      >
        Start With Timeslice
      </button>
      <button onClick={() => act(() => recorder.stopRecording())}>Stop</button>
      <button onClick={() => act(() => recorder.pauseRecording())}>
        Pause
      </button>
      <button onClick={() => act(() => recorder.resumeRecording())}>
        Resume
      </button>
      <p data-testid="is-error">{String(recorder.isError)}</p>
      <p data-testid="is-finalized">{String(recorder.isFinalized)}</p>
      <p data-testid="is-recording">{String(recorder.isRecording)}</p>
      <p data-testid="is-paused">{String(recorder.isPaused)}</p>
      <p data-testid="segments-length">{recorder.segments.length}</p>
      <p data-testid="error-message">{recorder.error?.message ?? "none"}</p>
    </>
  );
}

describe("useMediaRecorder lifecycle", () => {
  const originalMediaRecorder = globalThis.MediaRecorder;

  beforeEach(() => {
    MockMediaRecorder.instances = [];
    MockMediaRecorder.throwOnConstruct = null;
    MockMediaRecorder.throwOnStart = null;
    Object.defineProperty(globalThis, "MediaRecorder", {
      configurable: true,
      writable: true,
      value: MockMediaRecorder as unknown as typeof MediaRecorder,
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(globalThis, "MediaRecorder", {
      configurable: true,
      writable: true,
      value: originalMediaRecorder,
    });
  });

  test("starts from idle state", async () => {
    render(<RecorderLifecycleTestComponent />);

    expect(await screen.findByTestId("is-error")).toHaveTextContent("false");
    expect(screen.getByTestId("is-recording")).toHaveTextContent("false");
    expect(screen.getByTestId("is-finalized")).toHaveTextContent("false");
    expect(screen.getByTestId("segments-length")).toHaveTextContent("0");
  });

  test("uses the browser default timeslice unless one is provided", async () => {
    render(<RecorderLifecycleTestComponent />);

    await userEvent.click(await screen.findByText("Start"));

    expect(MockMediaRecorder.instances[0]?.startCalls[0]).toEqual([]);

    await userEvent.click(await screen.findByText("Start With Timeslice"));

    expect(MockMediaRecorder.instances[1]?.startCalls[0]).toEqual([250]);
  });

  test("cleans up the previous recorder when restarted", async () => {
    render(<RecorderLifecycleTestComponent />);

    await userEvent.click(await screen.findByText("Start"));
    const firstRecorder = MockMediaRecorder.instances[0];

    await userEvent.click(await screen.findByText("Start"));
    const secondRecorder = MockMediaRecorder.instances[1];

    expect(firstRecorder.stopCalls).toBe(1);

    act(() => {
      firstRecorder.dispatchData(new Blob(["old"]));
      secondRecorder.dispatchData(new Blob(["new"]));
    });

    await waitFor(() =>
      expect(screen.getByTestId("segments-length")).toHaveTextContent("1"),
    );
  });

  test("ignores async custom dataAvailableHandler callbacks from previous sessions after restart", async () => {
    const deferredCallbacks: (() => void)[] = [];

    function AsyncHandlerTestComponent() {
      const recorder = useMediaRecorder();

      return (
        <>
          <button
            onClick={() =>
              act(() =>
                recorder.startRecording(mockStream, {
                  dataAvailableHandler(ev, callback) {
                    deferredCallbacks.push(() =>
                      callback((current) => current.concat(ev.data)),
                    );
                  },
                }),
              )
            }
          >
            Start Async
          </button>
          <p data-testid="segments-length">{recorder.segments.length}</p>
        </>
      );
    }

    render(<AsyncHandlerTestComponent />);

    await userEvent.click(await screen.findByText("Start Async"));
    act(() => {
      MockMediaRecorder.instances[0]?.dispatchData(new Blob(["old"]));
    });
    expect(deferredCallbacks).toHaveLength(1);

    await userEvent.click(await screen.findByText("Start Async"));
    expect(MockMediaRecorder.instances).toHaveLength(2);
    expect(screen.getByTestId("segments-length")).toHaveTextContent("0");

    act(() => deferredCallbacks[0]());

    expect(screen.getByTestId("segments-length")).toHaveTextContent("0");
  });

  test("clears recorder errors when a new recording starts", async () => {
    render(<RecorderLifecycleTestComponent />);

    await userEvent.click(await screen.findByText("Start"));

    act(() => {
      MockMediaRecorder.instances[0]?.dispatchRecorderError();
    });

    await waitFor(() =>
      expect(screen.getByTestId("is-error")).toHaveTextContent("true"),
    );

    await userEvent.click(await screen.findByText("Start"));

    await waitFor(() =>
      expect(screen.getByTestId("is-error")).toHaveTextContent("false"),
    );
  });

  test("ignores late errors from previous recorder sessions after restart", async () => {
    function LateErrorTestComponent() {
      const recorder = useMediaRecorder();

      return (
        <>
          <button onClick={() => act(() => recorder.startRecording(mockStream))}>
            Start
          </button>
          <button
            onClick={() => {
              const previousRecorder = MockMediaRecorder.instances.at(-1);
              act(() => {
                recorder.startRecording(mockStream);
                previousRecorder?.dispatchRecorderError();
              });
            }}
          >
            Restart With Late Error
          </button>
          <p data-testid="is-error">{String(recorder.isError)}</p>
        </>
      );
    }

    render(<LateErrorTestComponent />);

    await userEvent.click(await screen.findByText("Start"));
    await waitFor(() =>
      expect(
        MockMediaRecorder.instances[0]?.listenerCounts.get("error"),
      ).toBeGreaterThan(0),
    );

    await userEvent.click(await screen.findByText("Restart With Late Error"));

    expect(screen.getByTestId("is-error")).toHaveTextContent("false");
  });

  test("finalizes even when stop yields no segments", async () => {
    render(<RecorderLifecycleTestComponent />);

    await userEvent.click(await screen.findByText("Start"));
    await userEvent.click(await screen.findByText("Stop"));

    await waitFor(() =>
      expect(screen.getByTestId("is-finalized")).toHaveTextContent("true"),
    );
    expect(screen.getByTestId("segments-length")).toHaveTextContent("0");
  });

  test("pause and resume toggle isPaused and isRecording", async () => {
    render(<RecorderLifecycleTestComponent />);

    await userEvent.click(await screen.findByText("Start"));
    await waitFor(() =>
      expect(screen.getByTestId("is-recording")).toHaveTextContent("true"),
    );
    expect(screen.getByTestId("is-paused")).toHaveTextContent("false");

    await userEvent.click(await screen.findByText("Pause"));
    await waitFor(() => {
      expect(screen.getByTestId("is-paused")).toHaveTextContent("true");
      expect(screen.getByTestId("is-recording")).toHaveTextContent("false");
      expect(screen.getByTestId("is-finalized")).toHaveTextContent("false");
    });

    await userEvent.click(await screen.findByText("Resume"));
    await waitFor(() => {
      expect(screen.getByTestId("is-paused")).toHaveTextContent("false");
      expect(screen.getByTestId("is-recording")).toHaveTextContent("true");
    });
  });

  test("surfaces MediaRecorder constructor failures as isError", async () => {
    MockMediaRecorder.throwOnConstruct = new Error("unsupported mimeType");

    render(<RecorderLifecycleTestComponent />);

    expect(() => {
      act(() => {
        screen.getByText("Start").click();
      });
    }).not.toThrow();

    await waitFor(() => {
      expect(screen.getByTestId("is-error")).toHaveTextContent("true");
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "unsupported mimeType",
      );
      expect(screen.getByTestId("is-recording")).toHaveTextContent("false");
    });
    expect(MockMediaRecorder.instances).toHaveLength(0);
  });

  test("surfaces recorder.start failures as isError", async () => {
    MockMediaRecorder.throwOnStart = new Error("start failed");

    render(<RecorderLifecycleTestComponent />);

    expect(() => {
      act(() => {
        screen.getByText("Start").click();
      });
    }).not.toThrow();

    await waitFor(() => {
      expect(screen.getByTestId("is-error")).toHaveTextContent("true");
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "start failed",
      );
      expect(screen.getByTestId("is-recording")).toHaveTextContent("false");
    });
  });

  test("preserves native MediaRecorder error details", async () => {
    render(<RecorderLifecycleTestComponent />);

    await userEvent.click(await screen.findByText("Start"));

    const nativeError = new DOMException("encoder failed", "EncodingError");
    act(() => {
      MockMediaRecorder.instances[0]?.dispatchRecorderError(nativeError);
    });

    await waitFor(() => {
      expect(screen.getByTestId("is-error")).toHaveTextContent("true");
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "encoder failed",
      );
    });
  });
});

function UserMediaTestComponent() {
  const { isReady, media, request } = useMedia("user");
  const { isFinalized, segments, startRecording, stopRecording } =
    useMediaRecorder();

  return (
    <>
      <button onClick={() => act(() => request({ video: true }))}>
        Begin Test
      </button>
      {isReady && (
        <>
          <VideoPlayer data-testid="media-playback" autoPlay media={media} />
          <button
            onClick={() =>
              act(() =>
                startRecording(media, {
                  dataAvailableHandler(ev, callback) {
                    act(() => callback((current) => current.concat(ev.data)));
                  },
                }),
              )
            }
          >
            Start Recording
          </button>
          <button onClick={() => act(() => stopRecording())}>
            Stop Recording
          </button>
          {isFinalized && (
            <p data-testid="media-recorded-length">{segments.length}</p>
          )}
        </>
      )}
    </>
  );
}

test("records userMedia video", async () => {
  render(<UserMediaTestComponent />);

  await userEvent.click(await screen.findByText("Begin Test"));

  const player = await screen.findByTestId<HTMLAudioElement>("media-playback");

  await userEvent.click(await screen.findByText("Start Recording"));

  await new Promise((resolve) => setTimeout(resolve, 200));

  await userEvent.click(await screen.findByText("Stop Recording"));

  const recordedLengthEl = await screen.findByTestId<HTMLParagraphElement>(
    "media-recorded-length",
  );

  expect(player.played.length).toBeGreaterThan(0);
  expect(Number(recordedLengthEl.innerText).valueOf()).toBeGreaterThan(0);
});
