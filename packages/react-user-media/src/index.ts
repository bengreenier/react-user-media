export type {
  AudioFrame,
  AudioProcessingStrategy,
  AudioProcessOptions,
  AudioProcessorErrorState,
  AudioProcessorIdleState,
  AudioProcessorLoadingState,
  AudioProcessorReadyState,
  AudioProcessorState,
  AudioProcessResult,
  MediaAudioProcessorOptions,
} from "./audio";
/**
 * Root-entry worker factory. Paths are relative to `dist/index.js`.
 * Prefer `@bengreenier/react-user-media/audio-worker` when importing the
 * dedicated subpath entry.
 */
export function createAudioWorker(): Worker {
  return new Worker(
    new URL(
      /* @vite-ignore */ "./audio/worker/audio-worker.js",
      import.meta.url,
    ),
    { type: "module" },
  );
}
export type {
  AudioProcessSubscriber,
  AudioWorkerApi,
} from "./audio/types";
export {
  type AudioWorkerState,
  type UseAudioWorkerOptions,
  useAudioWorker,
} from "./audio/use-audio-worker";
export * from "./close-media";
export * from "./components";
export * from "./hooks";
export type {
  CreateVideoTrackPipeline,
  MediaVideoProcessorOptions,
  VideoJobFrame,
  VideoProcessingStrategy,
  VideoProcessOptions,
  VideoProcessorErrorState,
  VideoProcessorIdleState,
  VideoProcessorLoadingState,
  VideoProcessorReadyState,
  VideoProcessorState,
  VideoProcessResult,
  VideoTrackPipeline,
} from "./video";
export {
  createVideoStreamWorkerBridge,
  type VideoStreamWorkerBridge,
} from "./video/stream-bridge";
export type {
  VideoProcessSubscriber,
  VideoWorkerApi,
} from "./video/types";
export {
  type UseVideoWorkerOptions,
  useVideoWorker,
  type VideoWorkerState,
} from "./video/use-video-worker";
/**
 * Root-entry worker factory. Paths are relative to `dist/index.js`.
 * Prefer `@bengreenier/react-user-media/video-worker` for the subpath entry.
 */
export function createVideoWorker(): Worker {
  return new Worker(
    new URL(
      /* @vite-ignore */ "./video/worker/video-worker.js",
      import.meta.url,
    ),
    { type: "module" },
  );
}

export function getSupportedConstraints() {
  return globalThis.navigator?.mediaDevices?.getSupportedConstraints?.() ?? {};
}
