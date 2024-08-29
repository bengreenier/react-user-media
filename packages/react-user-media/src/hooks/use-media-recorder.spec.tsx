import "@testing-library/jest-dom";
import { userEvent } from "@vitest/browser/context";
import { render, screen, act } from "@testing-library/react";
import { useMedia, useMediaRecorder, VideoPlayer } from "../";

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
