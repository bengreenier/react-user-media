import "@testing-library/jest-dom";
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";
import { vi } from "vitest";
import { useMedia } from "../";

interface FakeMediaStream extends MediaStream {
  id: string;
}

function createFakeMediaStream(id: string) {
  const track = {
    readyState: "live" as MediaStreamTrackState,
    stop: vi.fn(function stopTrack() {
      track.readyState = "ended";
    }),
  };

  const media = {
    id,
    getTracks: () => [track],
  } as unknown as FakeMediaStream;

  return { media, track };
}

function createDeferredMediaStream() {
  let resolve!: (media: MediaStream) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<MediaStream>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function UserMediaTestComponent() {
  const { error, isError, isLoading, isReady, media, request, stop } =
    useMedia("user");

  return (
    <>
      <button onClick={() => request({ video: true })}>Request</button>
      <button onClick={() => stop()}>Stop</button>
      <p data-testid="state">
        {isReady ? "ready" : isLoading ? "loading" : isError ? "error" : "idle"}
      </p>
      <p data-testid="media-id">{media?.id ?? "none"}</p>
      <p data-testid="error-message">{error?.message ?? "none"}</p>
    </>
  );
}

function DisplayMediaTestComponent() {
  const { isError, isLoading, isReady, media, request } = useMedia("display");

  return (
    <>
      <button onClick={() => request({ video: true })}>Request Display</button>
      <p data-testid="display-state">
        {isReady ? "ready" : isLoading ? "loading" : isError ? "error" : "idle"}
      </p>
      <p data-testid="display-media-id">{media?.id ?? "none"}</p>
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("stops the previous user media stream when re-requesting", async () => {
  const first = createFakeMediaStream("first");
  const second = createFakeMediaStream("second");
  vi.spyOn(navigator.mediaDevices, "getUserMedia")
    .mockResolvedValueOnce(first.media)
    .mockResolvedValueOnce(second.media);

  render(<UserMediaTestComponent />);

  act(() => {
    screen.getByText("Request").click();
  });

  await waitFor(() => {
    expect(screen.getByTestId("media-id")).toHaveTextContent("first");
  });

  act(() => {
    screen.getByText("Request").click();
  });

  expect(first.track.stop).toHaveBeenCalledTimes(1);
  expect(first.track.readyState).toBe("ended");

  await waitFor(() => {
    expect(screen.getByTestId("media-id")).toHaveTextContent("second");
  });
});

test("stop clears ready user media", async () => {
  const stream = createFakeMediaStream("stream");
  vi.spyOn(navigator.mediaDevices, "getUserMedia").mockResolvedValueOnce(
    stream.media,
  );

  render(<UserMediaTestComponent />);

  act(() => {
    screen.getByText("Request").click();
  });

  await waitFor(() => {
    expect(screen.getByTestId("state")).toHaveTextContent("ready");
  });

  act(() => {
    screen.getByText("Stop").click();
  });

  expect(stream.track.stop).toHaveBeenCalledTimes(1);
  expect(stream.track.readyState).toBe("ended");
  await waitFor(() => {
    expect(screen.getByTestId("state")).toHaveTextContent("idle");
    expect(screen.getByTestId("media-id")).toHaveTextContent("none");
  });
});

test("unmount cleanup stops ready user media tracks", async () => {
  const stream = createFakeMediaStream("stream");
  vi.spyOn(navigator.mediaDevices, "getUserMedia").mockResolvedValueOnce(
    stream.media,
  );

  const { unmount } = render(<UserMediaTestComponent />);

  act(() => {
    screen.getByText("Request").click();
  });

  await waitFor(() => {
    expect(screen.getByTestId("state")).toHaveTextContent("ready");
  });

  unmount();

  expect(stream.track.stop).toHaveBeenCalledTimes(1);
  expect(stream.track.readyState).toBe("ended");
});

test("stale user media promises after stop and re-request do not replace newer media", async () => {
  const stale = createFakeMediaStream("stale");
  const fresh = createFakeMediaStream("fresh");
  const staleRequest = createDeferredMediaStream();
  const freshRequest = createDeferredMediaStream();

  vi.spyOn(navigator.mediaDevices, "getUserMedia")
    .mockReturnValueOnce(staleRequest.promise)
    .mockReturnValueOnce(freshRequest.promise);

  render(<UserMediaTestComponent />);

  act(() => {
    screen.getByText("Request").click();
  });

  act(() => {
    screen.getByText("Stop").click();
  });

  act(() => {
    screen.getByText("Request").click();
  });

  await act(async () => {
    freshRequest.resolve(fresh.media);
    await freshRequest.promise;
  });

  await waitFor(() => {
    expect(screen.getByTestId("media-id")).toHaveTextContent("fresh");
  });

  await act(async () => {
    staleRequest.resolve(stale.media);
    await staleRequest.promise;
  });

  await waitFor(() => {
    expect(stale.track.stop).toHaveBeenCalledTimes(1);
    expect(stale.track.readyState).toBe("ended");
    expect(screen.getByTestId("state")).toHaveTextContent("ready");
    expect(screen.getByTestId("media-id")).toHaveTextContent("fresh");
  });

  expect(fresh.track.stop).not.toHaveBeenCalled();
});

test("missing mediaDevices reports an error state without throwing", async () => {
  const mediaDevices = navigator.mediaDevices;
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: undefined,
  });

  try {
    render(<UserMediaTestComponent />);

    expect(() => {
      act(() => {
        screen.getByText("Request").click();
      });
    }).not.toThrow();

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("error");
      expect(screen.getByTestId("media-id")).toHaveTextContent("none");
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "getUserMedia is not available",
      );
    });
  } finally {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: mediaDevices,
    });
  }
});

test("requests display media", async () => {
  const stream = createFakeMediaStream("display");
  const getDisplayMedia = vi.fn().mockResolvedValueOnce(stream.media);
  const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;

  Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
    configurable: true,
    value: getDisplayMedia,
  });

  try {
    render(<DisplayMediaTestComponent />);

    act(() => {
      screen.getByText("Request Display").click();
    });

    await waitFor(() => {
      expect(getDisplayMedia).toHaveBeenCalledWith({ video: true });
      expect(screen.getByTestId("display-state")).toHaveTextContent("ready");
      expect(screen.getByTestId("display-media-id")).toHaveTextContent(
        "display",
      );
    });
  } finally {
    Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
      configurable: true,
      value: originalGetDisplayMedia,
    });
  }
});

test("surfaces synchronous getUserMedia failures", async () => {
  vi.spyOn(navigator.mediaDevices, "getUserMedia").mockImplementation(() => {
    throw new Error("sync getUserMedia failure");
  });

  render(<UserMediaTestComponent />);

  expect(() => {
    act(() => {
      screen.getByText("Request").click();
    });
  }).not.toThrow();

  await waitFor(() => {
    expect(screen.getByTestId("state")).toHaveTextContent("error");
    expect(screen.getByTestId("error-message")).toHaveTextContent(
      "sync getUserMedia failure",
    );
  });
});

test("closes streams that resolve after unmount", async () => {
  const stream = createFakeMediaStream("late");
  const deferred = createDeferredMediaStream();
  vi.spyOn(navigator.mediaDevices, "getUserMedia").mockReturnValueOnce(
    deferred.promise,
  );

  const { unmount } = render(<UserMediaTestComponent />);

  act(() => {
    screen.getByText("Request").click();
  });

  unmount();

  await act(async () => {
    deferred.resolve(stream.media);
    await deferred.promise;
  });

  expect(stream.track.stop).toHaveBeenCalledTimes(1);
  expect(stream.track.readyState).toBe("ended");
});
