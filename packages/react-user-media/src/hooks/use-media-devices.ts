import { useState, useMemo, useCallback, useEffect } from "react";
import { ShallowShapeOf } from "../types";

/**
 * The base state of {@link useMediaDevices} response.
 */
interface MediaDeviceStateBase {
  isLoading: boolean;
  isError: boolean;
  isReady: boolean;

  error: Error | null;
  devices: MediaDeviceInfo[] | undefined;

  request(): void;
}

/**
 * The error state of the {@link useMediaDevices} response.
 */
interface MediaDeviceErrorState extends MediaDeviceStateBase {
  isLoading: false;
  isError: true;
  isReady: false;
  error: Error;
  devices: undefined;
}

/**
 * The loading state of the {@link useMediaDevices} response.
 */
interface MediaDeviceLoadingState extends MediaDeviceStateBase {
  isLoading: true;
  isError: false;
  isReady: false;
  error: null;
  devices: undefined;
}

/**
 * The ready state of the {@link useMediaDevices} response.
 */
interface MediaDeviceReadyState extends MediaDeviceStateBase {
  isLoading: false;
  isError: false;
  isReady: true;
  error: null;
  devices: MediaDeviceInfo[];
}

/**
 * The state of the {@link useMediaDevices} response.
 */
export type MediaDeviceState =
  | MediaDeviceErrorState
  | MediaDeviceLoadingState
  | MediaDeviceReadyState;

/**
 * Options for the {@link useMediaDevices} hook.
 */
export interface UseMediaDeviceOptions {
  /**
   * An optional filter to further limit the results.
   * @param device the device to process.
   * @returns `true` when included, `false` when excluded.
   *
   * Default: `() => true`.
   */
  filter?: (device: MediaDeviceInfo) => boolean;

  /**
   * An optional flag that causes the {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/devicechange_event|devicechange}
   * event to be monitored, automatically requesting updated devices as needed.
   *
   * Default: `true`.
   */
  deviceChangedEvent?: boolean;
}

/**
 * The default options for {@link useMediaDevices}.
 */
const defaultMediaDeviceOptions = {
  filter: () => true,
  deviceChangedEvent: true,
} satisfies Partial<UseMediaDeviceOptions>;

/**
 * Hook that allows the caller to obtain a list of devices on behalf of the user.
 *
 * See {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices|enumerateDevices}.
 * @param options the caller-defined options for the hook.
 * @returns see {@link MediaDeviceState} for more information.
 */
export function useMediaDevices(
  options?: UseMediaDeviceOptions,
): MediaDeviceState {
  const { filter, deviceChangedEvent } = {
    ...defaultMediaDeviceOptions,
    ...options,
  };

  const [devices, setDevices] = useState<MediaDeviceInfo[] | undefined>(
    undefined,
  );
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isError = useMemo(() => error !== null, [error]);
  const isReady = useMemo(() => typeof devices !== "undefined", [devices]);

  const request = useCallback(
    function requestMediaDevices() {
      // don't request again if one is still pending
      if (isLoading) {
        return;
      }

      if (!navigator.mediaDevices.enumerateDevices) {
        // see https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices
        return setError(
          new Error(
            `enumerateDevices is not available. Are you in a secure context?`,
          ),
        );
      }

      setIsLoading(true);
      setDevices(undefined);
      setError(null);

      navigator.mediaDevices.enumerateDevices().then(
        function onRequestSuccess(devices) {
          setDevices(devices.filter(filter));
          setError(null);
        },
        function onRequestError(error) {
          setError(error);
          setDevices(undefined);
        },
      );
    },
    [isLoading, filter],
  );

  useEffect(
    function requestMediaDevicesEvent() {
      if (deviceChangedEvent) {
        // note: This only fires in secure contexts
        // see https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/devicechange_event
        const onDeviceChange = () => {
          request();
        };

        navigator.mediaDevices.addEventListener("devicechange", onDeviceChange);

        return function teardown() {
          navigator.mediaDevices.removeEventListener(
            "devicechange",
            onDeviceChange,
          );
        };
      }
    },
    [deviceChangedEvent, request],
  );

  const state = {
    isError,
    isLoading,
    isReady,
    error,
    devices,
    request,
  } satisfies ShallowShapeOf<MediaDeviceState>;

  // we cast, as it isn't worth the runtime cost to check that this
  // lines up with each condition (isError, isLoading, isReady)
  return state as MediaDeviceState;
}
