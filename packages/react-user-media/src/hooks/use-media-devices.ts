import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ShallowShapeOf } from "../types";

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

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
 * The idle state of the {@link useMediaDevices} response.
 */
interface MediaDeviceIdleState extends MediaDeviceStateBase {
  isLoading: false;
  isError: false;
  isReady: false;
  error: null;
  devices: undefined;
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
  | MediaDeviceIdleState
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
  const requestGeneration = useRef(0);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const isError = useMemo(() => error !== null, [error]);
  const isReady = useMemo(() => typeof devices !== "undefined", [devices]);

  const request = useCallback(
    function requestMediaDevices() {
      const currentRequestGeneration = requestGeneration.current + 1;
      requestGeneration.current = currentRequestGeneration;

      const mediaDevices = navigator.mediaDevices;

      if (!mediaDevices?.enumerateDevices) {
        // see https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices
        setIsLoading(false);
        setDevices(undefined);
        return setError(
          new Error(
            `enumerateDevices is not available. Are you in a secure context?`,
          ),
        );
      }

      setIsLoading(true);
      setDevices(undefined);
      setError(null);

      mediaDevices.enumerateDevices().then(
        function onRequestSuccess(devices) {
          if (requestGeneration.current !== currentRequestGeneration) {
            return;
          }

          try {
            setDevices(devices.filter(filterRef.current));
            setError(null);
            setIsLoading(false);
          } catch (error) {
            setError(toError(error));
            setDevices(undefined);
            setIsLoading(false);
          }
        },
        function onRequestError(error) {
          if (requestGeneration.current !== currentRequestGeneration) {
            return;
          }

          setError(toError(error));
          setDevices(undefined);
          setIsLoading(false);
        },
      );
    },
    [],
  );

  useEffect(
    function requestMediaDevicesEvent() {
      const mediaDevices = navigator.mediaDevices;

      if (deviceChangedEvent && mediaDevices?.addEventListener) {
        // note: This only fires in secure contexts
        // see https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/devicechange_event
        const onDeviceChange = () => {
          request();
        };

        mediaDevices.addEventListener("devicechange", onDeviceChange);

        return function teardown() {
          mediaDevices.removeEventListener("devicechange", onDeviceChange);
        };
      }
    },
    [deviceChangedEvent, request],
  );

  useEffect(function invalidateRequestsOnUnmount() {
    return function teardown() {
      requestGeneration.current += 1;
    };
  }, []);

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
