/**
 * Media Worker Module
 * 
 * This module provides worker-based abstractions for media operations,
 * allowing for testing without full web worker stack while maintaining
 * production compatibility.
 */

// Types
export * from './types';

// Worker implementations
export { MockMediaWorkerController } from './mock-worker';
export { WebMediaWorkerController } from './web-worker';

// Factory and management
export {
  MediaWorkerFactory,
  getWorkerFactory,
  createWorkerFactory,
  createMediaWorker,
  type WorkerFactoryConfig,
} from './worker-factory';

// Hooks
export {
  useMediaWorker,
  type UseMediaWorkerConfig,
  type MediaWorkerHookState,
} from './use-media-worker';

export {
  useMediaWorkerRecorder,
  type MediaWorkerRecorderConfig,
  type MediaWorkerRecorderState,
} from './use-media-worker-recorder';

// Utility functions
export { createWorkerFactory as createMediaWorkerFactory } from './worker-factory';