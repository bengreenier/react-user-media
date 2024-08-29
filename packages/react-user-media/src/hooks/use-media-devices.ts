import { useState, useMemo, useCallback, useEffect } from "react";
import { ShapeOf } from "../types";

interface MediaDeviceStateBase {
  isLoading: boolean;
  isError: boolean;
  isReady: boolean;

  error: Error | null;
  devices: MediaDeviceInfo[] | undefined;

  request(): void;
}

interface MediaDeviceErrorState extends MediaDeviceStateBase {
  isLoading: false;
  isError: true;
  isReady: false;
  error: Error;
  devices: undefined;
}

interface MediaDeviceLoadingState extends MediaDeviceStateBase {
  isLoading: true;
  isError: false;
  isReady: false;
  error: null;
  devices: undefined;
}

interface MediaDeviceReadyState extends MediaDeviceStateBase {
  isLoading: false;
  isError: false;
  isReady: true;
  error: null;
  devices: MediaDeviceInfo[];
}

export type MediaDeviceState =
  | MediaDeviceErrorState
  | MediaDeviceLoadingState
  | MediaDeviceReadyState;

export interface UseMediaDeviceOptions {
  filter?: (device: MediaDeviceInfo) => boolean;
  deviceChangedEvent?: boolean;
}

const defaultMediaDeviceOptions = {
  filter: () => true,
  deviceChangedEvent: true,
} satisfies Partial<UseMediaDeviceOptions>;

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
  } satisfies ShapeOf<MediaDeviceState>;

  // we cast, as it isn't worth the runtime cost to check that this
  // lines up with each condition (isError, isLoading, isReady)
  return state as MediaDeviceState;
}
