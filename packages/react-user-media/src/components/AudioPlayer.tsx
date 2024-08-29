import {
  DetailedHTMLProps,
  forwardRef,
  useCallback,
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
  extends Omit<AudioElementProps, keyof Pick<AudioElementProps, "src">> {
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

    const setRef = useCallback(
      (element: HTMLAudioElement) => {
        if (typeof ref === "function") {
          // Pass the DOM element to the callback ref
          ref(element);
        } else if (ref) {
          // Assign the DOM element to the object ref
          ref.current = element;
        }

        if (element) {
          element.srcObject = media;
        }
      },
      [ref, media],
    );

    return <audio ref={setRef} {...rest} />;
  },
);
