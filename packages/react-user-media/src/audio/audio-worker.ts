/**
 * Creates the library's ESM Dedicated Worker for asynchronous PCM jobs.
 *
 * This module is the `./audio-worker` package export. The worker URL is
 * relative to `dist/audio/audio-worker.js`.
 *
 * CommonJS consumers should pass a `createWorker` override to
 * {@link useAudioWorker}, because module-worker URLs are ESM-only.
 */
export function createAudioWorker(): Worker {
  return new Worker(new URL("./worker/audio-worker.js", import.meta.url), {
    type: "module",
  });
}
