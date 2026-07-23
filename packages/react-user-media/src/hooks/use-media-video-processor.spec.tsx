import "@testing-library/jest-dom";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { VideoProcessResult, VideoTrackPipeline } from "../video";
import { useMediaVideoProcessor } from "./use-media-video-processor";

function VideoProcessorHarness({
  media,
  createPipeline,
}: {
  media: MediaStream;
  createPipeline?: (
    track: MediaStreamTrack,
    options: {
      metricIntervalMs: number;
      onResult: (result: VideoProcessResult) => void;
      signal: AbortSignal;
    },
  ) => Promise<VideoTrackPipeline>;
}) {
  const processor = useMediaVideoProcessor({
    strategy: "track",
    createPipeline,
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
      <output data-testid="width">{processor.result?.width ?? "none"}</output>
      <output data-testid="error">{processor.error?.message ?? "none"}</output>
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("reports missing MediaStreamTrackProcessor as an error", async () => {
  vi.stubGlobal("MediaStreamTrackProcessor", undefined);
  const media = {
    getVideoTracks: () => [
      { kind: "video", readyState: "live", stop: vi.fn() },
    ],
  } as unknown as MediaStream;

  render(<VideoProcessorHarness media={media} />);

  await act(async () => {
    screen.getByRole("button", { name: "start" }).click();
  });

  await waitFor(() => {
    expect(screen.getByTestId("state")).toHaveTextContent("error");
  });
  expect(screen.getByTestId("error")).toHaveTextContent(
    "MediaStreamTrackProcessor is not available",
  );
});

test("reaches ready with an injected pipeline and delivers metrics", async () => {
  const stop = vi.fn();
  const trackStop = vi.fn();
  const media = {
    getVideoTracks: () => [
      { kind: "video", readyState: "live", stop: trackStop },
    ],
  } as unknown as MediaStream;

  render(
    <VideoProcessorHarness
      media={media}
      createPipeline={async (_track, { onResult }) => {
        queueMicrotask(() => {
          onResult({
            width: 320,
            height: 240,
            timestamp: 42,
            format: "RGBA",
          });
        });
        return { stop };
      }}
    />,
  );

  await act(async () => {
    screen.getByRole("button", { name: "start" }).click();
  });

  await waitFor(() => {
    expect(screen.getByTestId("state")).toHaveTextContent("ready");
    expect(screen.getByTestId("width")).toHaveTextContent("320");
  });

  await act(async () => {
    screen.getByRole("button", { name: "stop" }).click();
  });

  expect(stop).toHaveBeenCalledOnce();
  expect(trackStop).not.toHaveBeenCalled();
  expect(screen.getByTestId("state")).toHaveTextContent("idle");
});

test("tears down pipeline on unmount without stopping tracks", async () => {
  const stop = vi.fn();
  const trackStop = vi.fn();
  const media = {
    getVideoTracks: () => [
      { kind: "video", readyState: "live", stop: trackStop },
    ],
  } as unknown as MediaStream;

  const view = render(
    <VideoProcessorHarness
      media={media}
      createPipeline={async () => ({ stop })}
    />,
  );

  await act(async () => {
    screen.getByRole("button", { name: "start" }).click();
  });

  await waitFor(() => {
    expect(screen.getByTestId("state")).toHaveTextContent("ready");
  });

  view.unmount();
  expect(stop).toHaveBeenCalledOnce();
  expect(trackStop).not.toHaveBeenCalled();
});
