import {
  DetailedHTMLProps,
  forwardRef,
  useCallback,
  useRef,
  AudioHTMLAttributes,
} from "react";

type AudioElementProps = DetailedHTMLProps<
  AudioHTMLAttributes<HTMLAudioElement>,
  HTMLAudioElement
>;

/**
 * React props for {@link AudioPlayer}.
 */
export interface AudioPlayerProps
  extends Omit<AudioElementProps, "src" | "srcObject"> {
  /**
   * The {@link MediaProvider} instance to play.
   */
  media: MediaProvider;
}

/**
 * Component for easier audio playback. Wraps {@link HTMLAudioElement|&lt;audio&gt;}.
 *
 * See {@link AudioPlayerProps}.
 */
export const AudioPlayer = forwardRef<HTMLAudioElement, AudioPlayerProps>(
  function AudioPlayer(props, ref) {
    const { media, ...rest } = props;
    const elementRef = useRef<HTMLAudioElement | null>(null);

    const setRef = useCallback(
      (element: HTMLAudioElement | null) => {
        if (typeof ref === "function") {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }

        if (element === null) {
          if (elementRef.current) {
            elementRef.current.srcObject = null;
            elementRef.current = null;
          }
        } else {
          if (elementRef.current && elementRef.current !== element) {
            elementRef.current.srcObject = null;
          }
          elementRef.current = element;
          element.srcObject = media;
        }
      },
      [ref, media],
    );

    return <audio ref={setRef} {...rest} />;
  },
);

AudioPlayer.displayName = "AudioPlayer";
