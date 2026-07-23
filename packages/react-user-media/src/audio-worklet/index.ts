/**
 * Returns the ESM module URL for the built-in level-meter AudioWorklet.
 *
 * CJS consumers should provide `workletModuleUrl`, because module-relative
 * worklet URLs are only guaranteed for ESM consumers.
 */
export function getLevelMeterWorkletModuleUrl(): URL {
  return new URL(/* @vite-ignore */ "./level-meter.js", import.meta.url);
}

/**
 * Loads the built-in level-meter processor into an AudioContext.
 */
export function addLevelMeterWorklet(
  audioContext: AudioContext,
  moduleUrl: string | URL = getLevelMeterWorkletModuleUrl(),
): Promise<void> {
  return audioContext.audioWorklet.addModule(moduleUrl);
}
