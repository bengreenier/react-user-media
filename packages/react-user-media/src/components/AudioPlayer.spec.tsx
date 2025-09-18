import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@vitest/browser/context";
import { useMedia } from "../";
import { AudioPlayer } from "./AudioPlayer";

function UserMediaTestComponent() {
	const { isReady, media, request } = useMedia("user");
	return (
		<>
			<button type="button" onClick={() => act(() => request({ audio: true }))}>
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
