import { useCallback, useMemo, useState } from "react";
import { ShallowShapeOf } from "../types";

type UserMediaBaseType = MediaStreamConstraints;
type DisplayMediaBaseType = DisplayMediaStreamOptions;

interface MediaStateBase<T> {
  isLoading: boolean;
  isError: boolean;
  isReady: boolean;

  error: Error | null;
  media: MediaStream | undefined;

  request(options?: T): void;
}

interface UserMediaErrorState extends MediaStateBase<UserMediaBaseType> {
  isLoading: false;
  isError: true;
  isReady: false;
  error: Error;
  media: undefined;
}

interface UserMediaLoadingState extends MediaStateBase<UserMediaBaseType> {
  isLoading: true;
  isError: false;
  isReady: false;
  error: null;
  media: undefined;
}

interface UserMediaReadyState extends MediaStateBase<UserMediaBaseType> {
  isLoading: false;
  isError: false;
  isReady: true;
  error: null;
  media: MediaStream;
}

export type UserMediaState =
  | UserMediaErrorState
  | UserMediaLoadingState
  | UserMediaReadyState;

interface DisplayMediaErrorState extends MediaStateBase<DisplayMediaBaseType> {
  isLoading: false;
  isError: true;
  isReady: false;
  error: Error;
  media: undefined;
}

interface DisplayMediaLoadingState
  extends MediaStateBase<DisplayMediaBaseType> {
  isLoading: true;
  isError: false;
  isReady: false;
  error: null;
  media: undefined;
}

interface DisplayMediaReadyState extends MediaStateBase<DisplayMediaBaseType> {
  isLoading: false;
  isError: false;
  isReady: true;
  error: null;
  media: MediaStream;
}

export type DisplayMediaState =
  | DisplayMediaErrorState
  | DisplayMediaLoadingState
  | DisplayMediaReadyState;

interface MediaDef<
  Type,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RequestExtensionType extends { request(...args: any[]): any },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  StateExtensionType extends MediaStateBase<any>,
> {
  type: Type;
  requestType: RequestExtensionType;
  stateType: StateExtensionType;
}

type UserMediaDef = MediaDef<
  "user",
  {
    request(constraints?: UserMediaBaseType): void;
  },
  UserMediaState
>;

type DisplayMediaDef = MediaDef<
  "display",
  {
    request(options?: DisplayMediaBaseType): void;
  },
  DisplayMediaState
>;

type inferMediaDef<Type> = Type extends UserMediaDef["type"]
  ? UserMediaDef
  : Type extends DisplayMediaDef["type"]
    ? DisplayMediaDef
    : never;

export function useMedia<
  TType extends UserMediaDef["type"] | DisplayMediaDef["type"],
>(type: TType): inferMediaDef<TType>["stateType"] {
  const [media, setMedia] = useState<MediaStream | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isError = useMemo(() => error !== null, [error]);
  const isReady = useMemo(() => typeof media !== "undefined", [media]);

  const request = useCallback(
    function requestUserMedia(
      ...args: Parameters<inferMediaDef<TType>["requestType"]["request"]>
    ) {
      // don't request again if one is still pending
      if (isLoading) {
        return;
      }

      if (type === "user" && !navigator.mediaDevices.getUserMedia) {
        // see https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
        return setError(
          new Error(
            `getUserMedia is not available. Are you using a modern browser?`,
          ),
        );
      }

      if (type === "display" && !navigator.mediaDevices.getDisplayMedia) {
        // see https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
        return setError(
          new Error(
            `getDisplayMedia is not available. Are you in a secure context?`,
          ),
        );
      }

      setIsLoading(true);
      setMedia(undefined);
      setError(null);

      switch (type) {
        case "user":
          navigator.mediaDevices
            .getUserMedia(...args)
            .then(
              function onRequestSuccess(userMedia) {
                setMedia(userMedia);
                setError(null);
              },
              function onRequestError(error) {
                setError(error);
                setMedia(undefined);
              },
            )
            .then(function finalizeRequest() {
              setIsLoading(false);
            });
          break;
        case "display":
          navigator.mediaDevices
            .getDisplayMedia(...args)
            .then(
              function onRequestSuccess(userMedia) {
                setMedia(userMedia);
                setError(null);
              },
              function onRequestError(error) {
                setError(error);
                setMedia(undefined);
              },
            )
            .then(function finalizeRequest() {
              setIsLoading(false);
            });
          break;
        default:
          (type) satisfies never;
      }
    },
    [type, isLoading],
  );

  const state = {
    isError,
    isLoading,
    isReady,
    error,
    media,
    request,
  } satisfies ShallowShapeOf<UserMediaState | DisplayMediaState>;

  // we cast, as it isn't worth the runtime cost to check that this
  // lines up with each condition (isError, isLoading, isReady)
  return state as inferMediaDef<TType>["stateType"];
}
