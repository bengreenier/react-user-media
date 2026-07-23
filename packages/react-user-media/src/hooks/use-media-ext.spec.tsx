import { renderHook, act } from "@testing-library/react";
import { useMediaAudioTracks, useMediaTracks, useMediaVideoTracks } from "../";

const createdTracks: MediaStreamTrack[] = [];

afterEach(() => {
  createdTracks.splice(0).forEach((track) => track.stop());
});

async function createTrack(kind: MediaStreamTrack["kind"]) {
  const constraints: MediaStreamConstraints =
    kind === "audio" ? { audio: true } : { video: true };
  const media = await navigator.mediaDevices.getUserMedia(constraints);
  const track = media.getTracks().find((candidate) => candidate.kind === kind);

  if (!track) {
    throw new Error(`Unable to create ${kind} track`);
  }

  createdTracks.push(...media.getTracks());

  return track;
}

function dispatchTrackEvent(
  media: MediaStream,
  eventName: "addtrack" | "removetrack",
) {
  media.dispatchEvent(new Event(eventName));
}

test("updates media tracks when a track is removed", async () => {
  const audioTrack = await createTrack("audio");
  const videoTrack = await createTrack("video");
  const media = new MediaStream([audioTrack, videoTrack]);
  const { result } = renderHook(() => useMediaTracks(media));

  expect(result.current).toHaveLength(2);
  expect(result.current[0]).toBe(audioTrack);
  expect(result.current[1]).toBe(videoTrack);

  act(() => {
    media.removeTrack(audioTrack);
    dispatchTrackEvent(media, "removetrack");
  });

  expect(result.current).toHaveLength(1);
  expect(result.current[0]).toBe(videoTrack);
});

test("updates media tracks when a track is replaced at the same count", async () => {
  const originalTrack = await createTrack("audio");
  const replacementTrack = await createTrack("audio");
  const media = new MediaStream([originalTrack]);
  const { result } = renderHook(() => useMediaTracks(media));

  expect(result.current).toHaveLength(1);
  expect(result.current[0]).toBe(originalTrack);

  act(() => {
    media.removeTrack(originalTrack);
    media.addTrack(replacementTrack);
    dispatchTrackEvent(media, "removetrack");
    dispatchTrackEvent(media, "addtrack");
  });

  expect(result.current).toHaveLength(1);
  expect(result.current[0]).toBe(replacementTrack);
});

test("returns a stable empty array when media becomes undefined", async () => {
  const track = await createTrack("audio");
  const media = new MediaStream([track]);
  const { result, rerender } = renderHook(
    ({ currentMedia }: { currentMedia: MediaStream | undefined }) =>
      useMediaTracks(currentMedia),
    { initialProps: { currentMedia: media } },
  );

  expect(result.current).toHaveLength(1);
  expect(result.current[0]).toBe(track);

  rerender({ currentMedia: undefined });

  expect(result.current).toEqual([]);

  const emptyTracks = result.current;

  rerender({ currentMedia: undefined });

  expect(result.current).toBe(emptyTracks);
});

test("keeps audio track references stable when only video tracks change", async () => {
  const audioTrack = await createTrack("audio");
  const videoTrack = await createTrack("video");
  const media = new MediaStream([audioTrack]);
  const { result } = renderHook(() => useMediaAudioTracks(media));

  expect(result.current).toHaveLength(1);
  expect(result.current[0]).toBe(audioTrack);

  const audioTracks = result.current;

  act(() => {
    media.addTrack(videoTrack);
    dispatchTrackEvent(media, "addtrack");
  });

  expect(result.current).toBe(audioTracks);
});

test("keeps video track references stable when only audio tracks change", async () => {
  const videoTrack = await createTrack("video");
  const audioTrack = await createTrack("audio");
  const media = new MediaStream([videoTrack]);
  const { result } = renderHook(() => useMediaVideoTracks(media));

  expect(result.current).toHaveLength(1);
  expect(result.current[0]).toBe(videoTrack);

  const videoTracks = result.current;

  act(() => {
    media.addTrack(audioTrack);
    dispatchTrackEvent(media, "addtrack");
  });

  expect(result.current).toBe(videoTracks);
});
