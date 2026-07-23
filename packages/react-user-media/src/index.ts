export * from "./hooks";
export * from "./components";
export * from "./close-media";

export function getSupportedConstraints() {
  return (
    globalThis.navigator?.mediaDevices?.getSupportedConstraints?.() ?? {}
  );
}
