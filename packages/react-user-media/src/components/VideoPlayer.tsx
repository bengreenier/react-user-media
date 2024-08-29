import {
  DetailedHTMLProps,
  forwardRef,
  VideoHTMLAttributes,
  useCallback,
} from "react";

type VideoElementProps = DetailedHTMLProps<
  VideoHTMLAttributes<HTMLVideoElement>,
  HTMLVideoElement
>;

export interface VideoPlayerProps
  extends Omit<VideoElementProps, keyof Pick<VideoElementProps, "src">> {
  media: MediaProvider;
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  function VideoPlayer(props, ref) {
    const { media, ...rest } = props;

    const setRef = useCallback(
      (element: HTMLVideoElement) => {
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

    return <video ref={setRef} {...rest} />;
  },
);
