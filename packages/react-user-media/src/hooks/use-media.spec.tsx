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

function UserMediaTestComponent() {
  const { isError, isLoading, isReady, media, request, stop } = useMedia("user");

  return (
    <>
      <button onClick={() => request({ video: true })}>Request</button>
      <button onClick={() => stop()}>Stop</button>
      <p data-testid="state">
        {isReady ? "ready" : isLoading ? "loading" : isError ? "error" : "idle"}
      </p>
      <p data-testid="media-id">{media?.id ?? "none"}</p>
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
