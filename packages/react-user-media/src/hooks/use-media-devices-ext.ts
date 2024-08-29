import { useMediaDevices } from "./use-media-devices";

/**
 * Hook that observes {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices|enumerateDevices}
 * results that have a {@link MediaDeviceInfo.kind|`kind`} starting with `audio` and
 * @param media the {@link MediaStream} to observe.
 * @returns a {@link MediaDeviceState}.
 */
export function useMediaAudioDevices() {
  return useMediaDevices({
    filter(device) {
      return device.kind.startsWith("audio");
    },
  });
}

/**
 * Hook that observes {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices|enumerateDevices}
 * results that have a {@link MediaDeviceInfo.kind|`kind`} of `audioinput` and
 * @param media the {@link MediaStream} to observe.
 * @returns a {@link MediaDeviceState}.
 */
export function useMediaAudioInputDevices() {
  return useMediaDevices({
    filter(device) {
      return device.kind === "audioinput";
    },
  });
}

/**
 * Hook that observes {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices|enumerateDevices}
 * results that have a {@link MediaDeviceInfo.kind|`kind`} of `audiooutput` and
 * @param media the {@link MediaStream} to observe.
 * @returns a {@link MediaDeviceState}.
 */
export function useMediaAudioOutputDevices() {
  return useMediaDevices({
    filter(device) {
      return device.kind === "audiooutput";
    },
  });
}

/**
 * Hook that observes {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices|enumerateDevices}
 * results that have a {@link MediaDeviceInfo.kind|`kind`} that starts with `video` and
 * @param media the {@link MediaStream} to observe.
 * @returns a {@link MediaDeviceState}.
 */
export function useMediaVideoDevices() {
  return useMediaDevices({
    filter(device) {
      return device.kind.startsWith("video");
    },
  });
}
