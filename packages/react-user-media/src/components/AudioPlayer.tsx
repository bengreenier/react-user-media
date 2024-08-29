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

export interface AudioPlayerProps
  extends Omit<AudioElementProps, keyof Pick<AudioElementProps, "src">> {
  media: MediaProvider;
}

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
