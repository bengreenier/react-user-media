/**
 * Reserved worker factory override for the Phase 2 worker strategy.
 *
 * The API intentionally accepts a generic module URL rather than assuming PCM
 * frames, so future WebCodecs `VideoFrame` jobs can share its lifecycle.
 */
export interface AudioWorkerModuleOptions {
  readonly createWorker?: (moduleUrl: string | URL) => Worker;
}
