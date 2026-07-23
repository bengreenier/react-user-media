import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@vitest/browser/context";
import { useMedia } from "../";
import { AudioPlayer } from "./AudioPlayer";
import { getHostRefCallback } from "./media-player-test-utils";

function UserMediaTestComponent() {
  const { isReady, media, request } = useMedia("user");
  return (
    <>
      <button onClick={() => act(() => request({ audio: true }))}>
        Begin Test
      </button>
      {isReady && (
        <AudioPlayer data-testid="media-playback" autoPlay media={media} />
      )}
    </>
  );
}

test("plays back userMedia audio", async () => {
  render(<UserMediaTestComponent />);

  await userEvent.click(await screen.findByText("Begin Test"));

  const player = await screen.findByTestId<HTMLAudioElement>("media-playback");

  await new Promise((resolve) => setTimeout(resolve, 2000));

  expect(player.played.length).toBeGreaterThan(0);
});

test("clears srcObject on unmount", () => {
  const stream = new MediaStream();
  let element: HTMLAudioElement | null = null;

  const { unmount } = render(
    <AudioPlayer
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

test("clears srcObject on previous element when DOM element is replaced", () => {
  const stream = new MediaStream();
  const { container } = render(<AudioPlayer media={stream} />);
  const previousElement = container.querySelector("audio")!;
  const nextElement = document.createElement("audio");

  expect(previousElement.srcObject).toBe(stream);

  act(() => {
    getHostRefCallback(previousElement)(nextElement);
  });

  expect(previousElement.srcObject).toBeNull();
  expect(nextElement.srcObject).toBe(stream);
});

test("updates srcObject when the media prop changes", () => {
  const first = new MediaStream();
  const second = new MediaStream();
  const { container, rerender } = render(<AudioPlayer media={first} />);
  const element = container.querySelector("audio")!;

  expect(element.srcObject).toBe(first);

  rerender(<AudioPlayer media={second} />);

  expect(element.srcObject).toBe(second);
});
