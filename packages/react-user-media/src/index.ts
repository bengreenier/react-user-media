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
export { createAudioWorker, createVideoWorker } from "./root-workers";
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

export function getSupportedConstraints() {
  return globalThis.navigator?.mediaDevices?.getSupportedConstraints?.() ?? {};
}
