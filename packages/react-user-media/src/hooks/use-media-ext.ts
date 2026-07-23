import { useSyncExternalStore, useCallback, useRef } from "react";

const EMPTY_TRACKS = Object.freeze([]) as unknown as MediaStreamTrack[];

function hasSameTrackIds(
  latestTracks: readonly MediaStreamTrack[],
  cachedTracks: readonly MediaStreamTrack[],
) {
  if (latestTracks.length !== cachedTracks.length) {
    return false;
  }

  const latestTrackIds = new Set(latestTracks.map((track) => track.id));
  const cachedTrackIds = new Set(cachedTracks.map((track) => track.id));

  if (latestTrackIds.size !== cachedTrackIds.size) {
    return false;
  }

  return (
    latestTracks.every((track) => cachedTrackIds.has(track.id)) &&
    cachedTracks.every((track) => latestTrackIds.has(track.id))
  );
}

function useMediaTracksByKind(
  media: MediaStream | undefined,
  kind: MediaStreamTrack["kind"],
) {
  const trackCache = useRef<MediaStreamTrack[]>(EMPTY_TRACKS);

  return useSyncExternalStore(
    useCallback(
      function subscribe(callback) {
        media?.addEventListener("addtrack", callback);
        media?.addEventListener("removetrack", callback);

        return function unsubscribe() {
          media?.removeEventListener("addtrack", callback);
          media?.removeEventListener("removetrack", callback);
        };
      },
      [media],
    ),
    useCallback(
      function getSnapshot() {
        if (!media) {
          trackCache.current = EMPTY_TRACKS;

          return trackCache.current;
        }

        const latestTracks = media
          .getTracks()
          .filter((track) => track.kind === kind);

        if (!hasSameTrackIds(latestTracks, trackCache.current)) {
          trackCache.current =
            latestTracks.length > 0 ? latestTracks : EMPTY_TRACKS;
        }

        return trackCache.current;
      },
      [kind, media],
    ),
  );
}

/**
 * Hook that observes {@link MediaStream.getTracks} and provides access
 * to the results.
 * @param media the {@link MediaStream} to observe.
 * @returns an array of {@link MediaStreamTrack}s.
 */
export function useMediaTracks(media: MediaStream | undefined) {
  const trackCache = useRef<MediaStreamTrack[]>(EMPTY_TRACKS);

  return useSyncExternalStore(
    useCallback(
      function subscribe(callback) {
        media?.addEventListener("addtrack", callback);
        media?.addEventListener("removetrack", callback);

        return function unsubscribe() {
          media?.removeEventListener("addtrack", callback);
          media?.removeEventListener("removetrack", callback);
        };
      },
      [media],
    ),
    useCallback(
      function getSnapshot() {
        if (!media) {
          trackCache.current = EMPTY_TRACKS;

          return trackCache.current;
        }

        // get tracks _always_ returns a new array
        // so we can't rely on its stability
        const latestTracks = media.getTracks();

        if (!hasSameTrackIds(latestTracks, trackCache.current)) {
          trackCache.current =
            latestTracks.length > 0 ? latestTracks : EMPTY_TRACKS;
        }

        // in the event of a cache update, this is technically the _last_
        // cached tracks, but that's by-design as-per the react docs
        // https://react.dev/reference/react/useSyncExternalStore#im-getting-an-error-the-result-of-getsnapshot-should-be-cached
        return trackCache.current;
      },
      [media],
    ),
  );
}

/**
 * Hook that observes {@link MediaStream.getTracks} results that
 * have a {@link MediaStreamTrack.kind|`kind`} of `audio` and
 * provides access to the results.
 * @param media the {@link MediaStream} to observe.
 * @returns an array of audio {@link MediaStreamTrack}s.
 */
export function useMediaAudioTracks(media: MediaStream | undefined) {
  return useMediaTracksByKind(media, "audio");
}

/**
 * Hook that observes {@link MediaStream.getTracks} results that
 * have a {@link MediaStreamTrack.kind|`kind`} of `video` and
 * provides access to the results.
 * @param media the {@link MediaStream} to observe.
 * @returns an array of video {@link MediaStreamTrack}s.
 */
export function useMediaVideoTracks(media: MediaStream | undefined) {
  return useMediaTracksByKind(media, "video");
}

/**
 * Either `muted` or `unmuted`.
 *
 * See {@link useTrackMuteState}.
 */
export type TrackMuteState = "muted" | "unmuted";

/**
 * Hook that observes a {@link MediaStreamTrack} {@link MediaStreamTrack.muted|`muted`} value
 * and provides access to the results.
 * @param track the {@link MediaStreamTrack} to observe.
 * @returns The {@link TrackMuteState} for the `track`.
 */
export function useTrackMuteState(track: MediaStreamTrack) {
  return useSyncExternalStore(
    useCallback(
      function subscribe(callback) {
        track.addEventListener("mute", callback);
        track.addEventListener("unmute", callback);

        return function unsubscribe() {
          track.removeEventListener("mute", callback);
          track.removeEventListener("unmute", callback);
        };
      },
      [track],
    ),
    useCallback(
      function getSnapshot(): TrackMuteState {
        return track.muted ? "muted" : "unmuted";
      },
      [track],
    ),
  );
}
