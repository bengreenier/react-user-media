import "@testing-library/jest-dom";
import { userEvent } from "@vitest/browser/context";
import { render, screen, act } from "@testing-library/react";
import { VideoPlayer } from "./VideoPlayer";
import { useMedia } from "../";

function UserMediaTestComponent() {
  const { isReady, media, request } = useMedia("user");
  return (
    <>
      <button onClick={() => act(() => request({ video: true }))}>
        Begin Test
      </button>
      {isReady && (
        <VideoPlayer data-testid="media-playback" autoPlay media={media} />
      )}
    </>
  );
}

test("plays back userMedia video", async () => {
  render(<UserMediaTestComponent />);

  await userEvent.click(await screen.findByText("Begin Test"));

  const player = await screen.findByTestId<HTMLAudioElement>("media-playback");

  await new Promise((resolve) => setTimeout(resolve, 2000));

  expect(player.played.length).toBeGreaterThan(0);
});

test("clears srcObject on unmount", () => {
  const stream = new MediaStream();
  let element: HTMLVideoElement | null = null;

  const { unmount } = render(
    <VideoPlayer
      ref={(el) => {
        if (el) {
          element = el;
        }
      }}
      media={stream}
    />,
  );

  expect(element).not.toBeNull();
  expect(element!.srcObject).toBe(stream);

  unmount();

  expect(element!.srcObject).toBeNull();
});
