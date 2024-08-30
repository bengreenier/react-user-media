import { useSyncExternalStore, useCallback, useRef } from "react";

/**
 * Hook that observes {@link MediaStream.getTracks} and provides access
 * to the results.
 * @param media the {@link MediaStream} to observe.
 * @returns an array of {@link MediaStreamTrack}s.
 */
export function useMediaTracks(media: MediaStream | undefined) {
  const trackCache = useRef<MediaStreamTrack[]>([]);

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
        if (media) {
          // get tracks _always_ returns a new array
          // so we can't rely on it's stability
          const latestTracks = media.getTracks();

          // if the latest tracks and the cached tracks count are the same
          if (latestTracks.length !== trackCache.current.length) {
            const latestTrackIds = latestTracks.map((t) => t.id);
            const cachedTrackIds = trackCache.current.map((t) => t.id);

            // and cachedTrackIds contains all the latestTrackIds
            if (!latestTrackIds.every((id) => cachedTrackIds.includes(id))) {
              trackCache.current = latestTracks;
            }
          }
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
  return useMediaTracks(media).filter((t) => t.kind === "audio");
}

/**
 * Hook that observes {@link MediaStream.getTracks} results that
 * have a {@link MediaStreamTrack.kind|`kind`} of `video` and
 * provides access to the results.
 * @param media the {@link MediaStream} to observe.
 * @returns an array of video {@link MediaStreamTrack}s.
 */
export function useMediaVideoTracks(media: MediaStream | undefined) {
  return useMediaTracks(media).filter((t) => t.kind === "video");
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
