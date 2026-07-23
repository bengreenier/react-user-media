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
export { createAudioWorker } from "./audio/audio-worker";
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

export function getSupportedConstraints() {
  return globalThis.navigator?.mediaDevices?.getSupportedConstraints?.() ?? {};
}
