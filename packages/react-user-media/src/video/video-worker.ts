/**
 * Creates the library's ESM Dedicated Worker for asynchronous video jobs.
 *
 * This module is the `./video-worker` package export. The worker URL is
 * relative to `dist/video/video-worker.js`.
 *
 * CommonJS consumers should pass a `createWorker` override to
 * {@link useVideoWorker}, because module-worker URLs are ESM-only.
 */
export function createVideoWorker(): Worker {
  return new Worker(new URL("./worker/video-worker.js", import.meta.url), {
    type: "module",
  });
}
