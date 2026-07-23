import {
  type DetailedHTMLProps,
  forwardRef,
  useCallback,
  useRef,
  type VideoHTMLAttributes,
} from "react";

type VideoElementProps = DetailedHTMLProps<
  VideoHTMLAttributes<HTMLVideoElement>,
  HTMLVideoElement
>;

/**
 * React props for {@link VideoPlayer}.
 */
export interface VideoPlayerProps
  extends Omit<VideoElementProps, "src" | "srcObject"> {
  /**
   * The {@link MediaProvider} instance to play.
   */
  media: MediaProvider;
}

/**
 * Component for easier video playback. Wraps {@link HTMLVideoElement|&lt;video&gt;}.
 *
 * See {@link VideoPlayerProps}.
 */
export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  function VideoPlayer(props, ref) {
    const { media, ...rest } = props;
    const elementRef = useRef<HTMLVideoElement | null>(null);

    const setRef = useCallback(
      (element: HTMLVideoElement | null) => {
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

    return <video ref={setRef} {...rest} />;
  },
);

VideoPlayer.displayName = "VideoPlayer";
