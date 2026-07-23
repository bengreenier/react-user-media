export * from "./close-media";
export * from "./components";
export * from "./hooks";

export function getSupportedConstraints() {
  return globalThis.navigator?.mediaDevices?.getSupportedConstraints?.() ?? {};
}
