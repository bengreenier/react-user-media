/**
 * Minimal Insertable Streams typings not yet universal in TypeScript DOM libs.
 */

export interface MediaStreamTrackProcessorInit {
  track: MediaStreamTrack;
  maxBufferSize?: number;
}

export interface MediaStreamTrackProcessorLike<T = VideoFrame> {
  readonly readable: ReadableStream<T>;
}

export interface MediaStreamTrackProcessorConstructor {
  new (
    init: MediaStreamTrackProcessorInit,
  ): MediaStreamTrackProcessorLike<VideoFrame>;
}

export function getMediaStreamTrackProcessorConstructor():
  | MediaStreamTrackProcessorConstructor
  | undefined {
  const ctor = (
    globalThis as unknown as {
      MediaStreamTrackProcessor?: MediaStreamTrackProcessorConstructor;
    }
  ).MediaStreamTrackProcessor;
  return typeof ctor === "function" ? ctor : undefined;
}
