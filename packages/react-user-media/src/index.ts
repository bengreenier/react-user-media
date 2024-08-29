export * from "./hooks";
export * from "./components";

export function getSupportedConstraints() {
  return navigator.mediaDevices.getSupportedConstraints();
}

export function closeMedia(media: MediaStream) {
  media.getTracks().forEach(function closeMediaTrack(track) {
    track.stop();
  });
}
