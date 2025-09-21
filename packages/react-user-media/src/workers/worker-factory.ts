import type { MediaWorkerController, MediaWorkerFactory } from './types';
import { MockMediaWorkerController } from './mock-worker';
import { WebMediaWorkerController } from './web-worker';

/**
 * Configuration for worker factory
 */
export interface WorkerFactoryConfig {
  /**
   * Whether to use mock worker for testing/development
   * @default false
   */
  useMockWorker?: boolean;
  
  /**
   * Custom worker script for production workers
   */
  workerScript?: string;
  
  /**
   * Environment detection function
   * @default () => typeof Worker !== 'undefined'
   */
  isWorkerSupported?: () => boolean;
}

/**
 * Default configuration
 */
const defaultConfig: Required<WorkerFactoryConfig> = {
  useMockWorker: false,
  workerScript: undefined,
  isWorkerSupported: () => typeof Worker !== 'undefined',
};

/**
 * Worker factory for creating appropriate worker implementations
 */
export class MediaWorkerFactory {
  private config: Required<WorkerFactoryConfig>;
  private workerInstances: Map<string, MediaWorkerController> = new Map();

  constructor(config: WorkerFactoryConfig = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Create a new worker instance
   * @param id Unique identifier for the worker instance
   * @returns MediaWorkerController instance
   */
  createWorker(id: string = 'default'): MediaWorkerController {
    // Return existing instance if available
    if (this.workerInstances.has(id)) {
      return this.workerInstances.get(id)!;
    }

    let worker: MediaWorkerController;

    if (this.config.useMockWorker) {
      worker = new MockMediaWorkerController();
    } else if (this.config.isWorkerSupported()) {
      worker = new WebMediaWorkerController(this.config.workerScript);
    } else {
      console.warn('Web Workers not supported, falling back to mock worker');
      worker = new MockMediaWorkerController();
    }

    this.workerInstances.set(id, worker);
    return worker;
  }

  /**
   * Get an existing worker instance
   * @param id Worker instance identifier
   * @returns MediaWorkerController instance or undefined
   */
  getWorker(id: string = 'default'): MediaWorkerController | undefined {
    return this.workerInstances.get(id);
  }

  /**
   * Remove and terminate a worker instance
   * @param id Worker instance identifier
   */
  removeWorker(id: string = 'default'): void {
    const worker = this.workerInstances.get(id);
    if (worker) {
      worker.terminate();
      this.workerInstances.delete(id);
    }
  }

  /**
   * Remove and terminate all worker instances
   */
  removeAllWorkers(): void {
    this.workerInstances.forEach(worker => worker.terminate());
    this.workerInstances.clear();
  }

  /**
   * Update factory configuration
   * @param config New configuration
   */
  updateConfig(config: Partial<WorkerFactoryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<WorkerFactoryConfig> {
    return { ...this.config };
  }

  /**
   * Check if workers are supported in current environment
   */
  isWorkerSupported(): boolean {
    return this.config.isWorkerSupported();
  }

  /**
   * Get list of active worker IDs
   */
  getActiveWorkerIds(): string[] {
    return Array.from(this.workerInstances.keys());
  }
}

/**
 * Global worker factory instance
 */
let globalWorkerFactory: MediaWorkerFactory | null = null;

/**
 * Get or create the global worker factory
 * @param config Optional configuration for the factory
 * @returns MediaWorkerFactory instance
 */
export function getWorkerFactory(config?: WorkerFactoryConfig): MediaWorkerFactory {
  if (!globalWorkerFactory) {
    globalWorkerFactory = new MediaWorkerFactory(config);
  }
  return globalWorkerFactory;
}

/**
 * Create a worker factory function
 * @param config Factory configuration
 * @returns MediaWorkerFactory function
 */
export function createWorkerFactory(config?: WorkerFactoryConfig): MediaWorkerFactory {
  return new MediaWorkerFactory(config);
}

/**
 * Default factory function for creating workers
 * @param config Optional configuration
 * @returns MediaWorkerController instance
 */
export const createMediaWorker: MediaWorkerFactory = (config?: WorkerFactoryConfig) => {
  const factory = getWorkerFactory(config);
  return factory.createWorker();
};