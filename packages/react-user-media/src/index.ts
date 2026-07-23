export * from "./audio/audio-worker";
export * from "./audio/types";
export * from "./audio/use-audio-worker";
export * from "./close-media";
export * from "./components";
export * from "./hooks";

export function getSupportedConstraints() {
  return globalThis.navigator?.mediaDevices?.getSupportedConstraints?.() ?? {};
}
