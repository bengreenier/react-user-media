import { UseMediaDeviceOptions, useMediaDevices } from "./use-media-devices";

/**
 * Hook that observes {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices|enumerateDevices}
 * results that have a {@link MediaDeviceInfo.kind|`kind`} starting with `audio` and
 * @param options the caller-defined options for the hook.
 * @returns a {@link MediaDeviceState}.
 */
export function useMediaAudioDevices(options?: UseMediaDeviceOptions) {
  return useMediaDevices({
    ...options,
    filter(device) {
      return (
        device.kind.startsWith("audio") &&
        (!options?.filter || options.filter(device))
      );
    },
  });
}

/**
 * Hook that observes {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices|enumerateDevices}
 * results that have a {@link MediaDeviceInfo.kind|`kind`} of `audioinput` and
 * @param options the caller-defined options for the hook.
 * @returns a {@link MediaDeviceState}.
 */
export function useMediaAudioInputDevices(options?: UseMediaDeviceOptions) {
  return useMediaDevices({
    ...options,
    filter(device) {
      return (
        device.kind === "audioinput" &&
        (!options?.filter || options.filter(device))
      );
    },
  });
}

/**
 * Hook that observes {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices|enumerateDevices}
 * results that have a {@link MediaDeviceInfo.kind|`kind`} of `audiooutput` and
 * @param options the caller-defined options for the hook.
 * @returns a {@link MediaDeviceState}.
 */
export function useMediaAudioOutputDevices(options?: UseMediaDeviceOptions) {
  return useMediaDevices({
    ...options,
    filter(device) {
      return (
        device.kind === "audiooutput" &&
        (!options?.filter || options.filter(device))
      );
    },
  });
}

/**
 * Hook that observes {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices|enumerateDevices}
 * results that have a {@link MediaDeviceInfo.kind|`kind`} that starts with `video` and
 * @param options the caller-defined options for the hook.
 * @returns a {@link MediaDeviceState}.
 */
export function useMediaVideoDevices(options?: UseMediaDeviceOptions) {
  return useMediaDevices({
    ...options,
    filter(device) {
      return (
        device.kind.startsWith("video") &&
        (!options?.filter || options.filter(device))
      );
    },
  });
}
