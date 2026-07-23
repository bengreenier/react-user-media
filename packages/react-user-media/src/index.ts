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
export * from "./close-media";
export * from "./components";
export * from "./hooks";

export function getSupportedConstraints() {
  return globalThis.navigator?.mediaDevices?.getSupportedConstraints?.() ?? {};
}
