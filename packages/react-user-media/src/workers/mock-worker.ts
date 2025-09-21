import type {
  MediaWorkerController,
  MediaWorkerMessage,
  MediaWorkerMessageType,
  MediaWorkerRecordingConfig,
  MediaWorkerProcessingOptions,
  MediaWorkerDeviceInfo,
  MediaWorkerState,
} from './types';

/**
 * Mock implementation of MediaWorkerController for testing and development
 * This allows testing worker functionality without actual web workers
 */
export class MockMediaWorkerController implements MediaWorkerController {
  private state: MediaWorkerState = {
    isInitialized: false,
    isRecording: false,
    isProcessing: false,
    error: null,
    recordingStartTime: null,
    recordingEndTime: null,
    segments: [],
    mimeType: null,
  };

  private subscribers: Set<(message: MediaWorkerMessage) => void> = new Set();
  private recordingConfig: MediaWorkerRecordingConfig | null = null;
  private messageId = 0;

  constructor() {
    // Simulate initialization delay
    setTimeout(() => {
      this.state.isInitialized = true;
      this.notifySubscribers({
        id: this.generateId(),
        type: 'SUCCESS',
        payload: { message: 'Worker initialized' },
      });
    }, 10);
  }

  async initialize(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.state.isInitialized = true;
        this.state.error = null;
        resolve();
      }, 10);
    });
  }

  async startRecording(config?: MediaWorkerRecordingConfig): Promise<void> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    if (this.state.isRecording) {
      throw new Error('Already recording');
    }

    this.recordingConfig = config || {};
    this.state.isRecording = true;
    this.state.recordingStartTime = performance.now();
    this.state.segments = [];
    this.state.mimeType = config?.mimeType || 'video/webm';
    this.state.error = null;

    // Simulate data availability events
    this.simulateDataAvailable();

    this.notifySubscribers({
      id: this.generateId(),
      type: 'SUCCESS',
      payload: { message: 'Recording started' },
    });
  }

  async stopRecording(): Promise<Blob[]> {
    if (!this.state.isRecording) {
      throw new Error('Not currently recording');
    }

    this.state.isRecording = false;
    this.state.recordingEndTime = performance.now();

    // Generate mock blob data
    const mockBlob = new Blob(['mock recording data'], { 
      type: this.state.mimeType || 'video/webm' 
    });
    this.state.segments = [mockBlob];

    this.notifySubscribers({
      id: this.generateId(),
      type: 'SUCCESS',
      payload: { message: 'Recording stopped', segments: this.state.segments },
    });

    return this.state.segments;
  }

  async processMedia(data: Blob, options: MediaWorkerProcessingOptions): Promise<Blob> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    this.state.isProcessing = true;

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    this.state.isProcessing = false;

    // Return mock processed data
    const processedData = new Blob([`processed_${data.size}_bytes`], { 
      type: data.type 
    });

    this.notifySubscribers({
      id: this.generateId(),
      type: 'SUCCESS',
      payload: { message: 'Media processed', result: processedData },
    });

    return processedData;
  }

  async getDevices(): Promise<MediaWorkerDeviceInfo[]> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    // Return mock device data
    const mockDevices: MediaWorkerDeviceInfo[] = [
      {
        deviceId: 'mock-camera-1',
        kind: 'videoinput',
        label: 'Mock Camera 1',
        groupId: 'mock-group-1',
      },
      {
        deviceId: 'mock-microphone-1',
        kind: 'audioinput',
        label: 'Mock Microphone 1',
        groupId: 'mock-group-1',
      },
    ];

    this.notifySubscribers({
      id: this.generateId(),
      type: 'SUCCESS',
      payload: { message: 'Devices retrieved', devices: mockDevices },
    });

    return mockDevices;
  }

  getState(): MediaWorkerState {
    return { ...this.state };
  }

  subscribe(callback: (message: MediaWorkerMessage) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  terminate(): void {
    this.state = {
      isInitialized: false,
      isRecording: false,
      isProcessing: false,
      error: null,
      recordingStartTime: null,
      recordingEndTime: null,
      segments: [],
      mimeType: null,
    };
    this.subscribers.clear();
  }

  private generateId(): string {
    return `mock-${++this.messageId}`;
  }

  private notifySubscribers(message: MediaWorkerMessage): void {
    this.subscribers.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in worker subscriber:', error);
      }
    });
  }

  private simulateDataAvailable(): void {
    if (!this.state.isRecording) return;

    // Simulate periodic data availability
    const interval = setInterval(() => {
      if (!this.state.isRecording) {
        clearInterval(interval);
        return;
      }

      const mockData = new Blob([`chunk_${Date.now()}`], { 
        type: this.state.mimeType || 'video/webm' 
      });
      
      this.state.segments.push(mockData);

      this.notifySubscribers({
        id: this.generateId(),
        type: 'DATA_AVAILABLE',
        payload: { data: mockData, segments: this.state.segments },
      });
    }, 1000); // Simulate 1-second chunks
  }
}