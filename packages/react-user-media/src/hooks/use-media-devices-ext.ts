import { useMediaDevices } from "./use-media-devices";

export function useMediaAudioDevices() {
  return useMediaDevices({
    filter(device) {
      return device.kind.startsWith("audio");
    },
  });
}

export function useMediaAudioInputDevices() {
  return useMediaDevices({
    filter(device) {
      return device.kind === "audioinput";
    },
  });
}

export function useMediaAudioOutputDevices() {
  return useMediaDevices({
    filter(device) {
      return device.kind === "audiooutput";
    },
  });
}

export function useMediaVideoDevices() {
  return useMediaDevices({
    filter(device) {
      return device.kind.startsWith("video");
    },
  });
}
