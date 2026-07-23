import "@testing-library/jest-dom";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useTrackMuteState } from "../";

function createTrack(muted: boolean) {
  const track = new EventTarget() as EventTarget & {
    muted: boolean;
  };
  track.muted = muted;
  return track as unknown as MediaStreamTrack;
}

test("useTrackMuteState reflects muted and unmute events", async () => {
  const track = createTrack(false);
  const { result } = renderHook(() => useTrackMuteState(track));

  expect(result.current).toBe("unmuted");

  await act(async () => {
    track.muted = true;
    track.dispatchEvent(new Event("mute"));
  });

  await waitFor(() => {
    expect(result.current).toBe("muted");
  });

  await act(async () => {
    track.muted = false;
    track.dispatchEvent(new Event("unmute"));
  });

  await waitFor(() => {
    expect(result.current).toBe("unmuted");
  });
});

test("useTrackMuteState starts muted when the track is muted", () => {
  const track = createTrack(true);
  const { result } = renderHook(() => useTrackMuteState(track));

  expect(result.current).toBe("muted");
});

test("useTrackMuteState ignores mute events from a previous track", async () => {
  const first = createTrack(false);
  const second = createTrack(false);
  const { result, rerender } = renderHook(
    ({ track }: { track: MediaStreamTrack }) => useTrackMuteState(track),
    { initialProps: { track: first } },
  );

  expect(result.current).toBe("unmuted");

  rerender({ track: second });

  await act(async () => {
    first.muted = true;
    first.dispatchEvent(new Event("mute"));
  });

  expect(result.current).toBe("unmuted");

  await act(async () => {
    second.muted = true;
    second.dispatchEvent(new Event("mute"));
  });

  await waitFor(() => {
    expect(result.current).toBe("muted");
  });
});
