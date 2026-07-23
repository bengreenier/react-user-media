export function closeMedia(media: MediaStream | undefined) {
  media?.getTracks().forEach(function closeMediaTrack(track) {
    track.stop();
  });
}
