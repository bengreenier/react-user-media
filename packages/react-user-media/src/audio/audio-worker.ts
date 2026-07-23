/**
 * Creates the library's ESM Dedicated Worker for asynchronous PCM jobs.
 *
 * CommonJS consumers should pass a `createWorker` override to
 * {@link useAudioWorker}, because module-worker URLs are ESM-only.
 */
export function createAudioWorker(): Worker {
  return new Worker(
    new URL(/* @vite-ignore */ "./worker/audio-worker.js", import.meta.url),
    {
      type: "module",
    },
  );
}
