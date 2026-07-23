/**
 * Worker factories for the root package entry (`dist/index.js`).
 *
 * Paths differ from the `./audio-worker` / `./video-worker` subpath entries
 * because those resolve `./worker/*.js` next to themselves, while the root
 * bundle must reach `./audio/worker/*.js` and `./video/worker/*.js`.
 */

export function createAudioWorker(): Worker {
  return new Worker(
    new URL("./audio/worker/audio-worker.js", import.meta.url),
    { type: "module" },
  );
}

export function createVideoWorker(): Worker {
  return new Worker(
    new URL("./video/worker/video-worker.js", import.meta.url),
    { type: "module" },
  );
}
