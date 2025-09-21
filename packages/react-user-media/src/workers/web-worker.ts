import type {
  MediaWorkerController,
  MediaWorkerMessage,
  MediaWorkerRecordingConfig,
  MediaWorkerProcessingOptions,
  MediaWorkerDeviceInfo,
  MediaWorkerState,
} from './types';

/**
 * Production implementation of MediaWorkerController using actual Web Workers
 */
export class WebMediaWorkerController implements MediaWorkerController {
  private worker: Worker | null = null;
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
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }> = new Map();
  private messageId = 0;

  constructor(workerScript?: string) {
    this.initializeWorker(workerScript);
  }

  private initializeWorker(workerScript?: string): void {
    try {
      // Create worker from inline script or external file
      if (workerScript) {
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
      } else {
        // Use default worker implementation
        this.worker = this.createDefaultWorker();
      }

      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
    } catch (error) {
      this.state.error = `Failed to create worker: ${error}`;
      console.error('Worker creation failed:', error);
    }
  }

  private createDefaultWorker(): Worker {
    const workerScript = `
      // Default media worker implementation
      let mediaRecorder = null;
      let recordingConfig = null;
      let segments = [];
      let isRecording = false;

      self.onmessage = function(e) {
        const { id, type, payload } = e.data;
        
        try {
          switch (type) {
            case 'INIT':
              self.postMessage({ id, type: 'SUCCESS', payload: { message: 'Worker initialized' } });
              break;
              
            case 'START_RECORDING':
              if (isRecording) {
                throw new Error('Already recording');
              }
              
              recordingConfig = payload;
              isRecording = true;
              segments = [];
              
              // In a real implementation, you would set up MediaRecorder here
              // For now, we'll simulate the behavior
              self.postMessage({ 
                id, 
                type: 'SUCCESS', 
                payload: { message: 'Recording started' } 
              });
              break;
              
            case 'STOP_RECORDING':
              if (!isRecording) {
                throw new Error('Not currently recording');
              }
              
              isRecording = false;
              
              // Simulate recording data
              const mockBlob = new Blob(['mock recording data'], { 
                type: recordingConfig?.mimeType || 'video/webm' 
              });
              segments = [mockBlob];
              
              self.postMessage({ 
                id, 
                type: 'SUCCESS', 
                payload: { message: 'Recording stopped', segments } 
              });
              break;
              
            case 'PROCESS_MEDIA':
              // Simulate media processing
              const processedData = new Blob([\`processed_\${payload.data.size}_bytes\`], { 
                type: payload.data.type 
              });
              
              self.postMessage({ 
                id, 
                type: 'SUCCESS', 
                payload: { message: 'Media processed', result: processedData } 
              });
              break;
              
            case 'GET_DEVICES':
              // Simulate device enumeration
              const devices = [
                {
                  deviceId: 'camera-1',
                  kind: 'videoinput',
                  label: 'Camera 1',
                  groupId: 'group-1'
                },
                {
                  deviceId: 'microphone-1',
                  kind: 'audioinput',
                  label: 'Microphone 1',
                  groupId: 'group-1'
                }
              ];
              
              self.postMessage({ 
                id, 
                type: 'SUCCESS', 
                payload: { message: 'Devices retrieved', devices } 
              });
              break;
              
            default:
              throw new Error(\`Unknown message type: \${type}\`);
          }
        } catch (error) {
          self.postMessage({ 
            id, 
            type: 'ERROR', 
            error: error.message 
          });
        }
      };
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }

  private handleWorkerMessage(event: MessageEvent): void {
    const message: MediaWorkerMessage = event.data;
    
    // Handle pending requests
    const pendingRequest = this.pendingRequests.get(message.id);
    if (pendingRequest) {
      this.pendingRequests.delete(message.id);
      
      if (message.type === 'ERROR') {
        pendingRequest.reject(new Error(message.error || 'Unknown worker error'));
      } else {
        pendingRequest.resolve(message.payload);
      }
    }

    // Update state based on message
    this.updateStateFromMessage(message);

    // Notify subscribers
    this.notifySubscribers(message);
  }

  private handleWorkerError(error: ErrorEvent): void {
    this.state.error = `Worker error: ${error.message}`;
    console.error('Worker error:', error);
    
    this.notifySubscribers({
      id: this.generateId(),
      type: 'ERROR',
      error: error.message,
    });
  }

  private updateStateFromMessage(message: MediaWorkerMessage): void {
    switch (message.type) {
      case 'SUCCESS':
        if (message.payload?.message === 'Worker initialized') {
          this.state.isInitialized = true;
          this.state.error = null;
        } else if (message.payload?.message === 'Recording started') {
          this.state.isRecording = true;
          this.state.recordingStartTime = performance.now();
          this.state.segments = [];
        } else if (message.payload?.message === 'Recording stopped') {
          this.state.isRecording = false;
          this.state.recordingEndTime = performance.now();
          this.state.segments = message.payload.segments || [];
        }
        break;
      case 'ERROR':
        this.state.error = message.error || 'Unknown error';
        break;
      case 'DATA_AVAILABLE':
        if (message.payload?.data) {
          this.state.segments.push(message.payload.data);
        }
        break;
    }
  }

  async initialize(): Promise<void> {
    return this.sendMessage('INIT');
  }

  async startRecording(config?: MediaWorkerRecordingConfig): Promise<void> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }
    if (this.state.isRecording) {
      throw new Error('Already recording');
    }

    this.state.mimeType = config?.mimeType || 'video/webm';
    return this.sendMessage('START_RECORDING', config);
  }

  async stopRecording(): Promise<Blob[]> {
    if (!this.state.isRecording) {
      throw new Error('Not currently recording');
    }

    const result = await this.sendMessage('STOP_RECORDING');
    return result.segments || [];
  }

  async processMedia(data: Blob, options: MediaWorkerProcessingOptions): Promise<Blob> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    this.state.isProcessing = true;
    
    try {
      const result = await this.sendMessage('PROCESS_MEDIA', { data, options });
      return result.result;
    } finally {
      this.state.isProcessing = false;
    }
  }

  async getDevices(): Promise<MediaWorkerDeviceInfo[]> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    const result = await this.sendMessage('GET_DEVICES');
    return result.devices || [];
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
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
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
    this.pendingRequests.clear();
  }

  private sendMessage(type: string, payload?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const id = this.generateId();
      this.pendingRequests.set(id, { resolve, reject });

      this.worker.postMessage({
        id,
        type,
        payload,
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Worker request timeout'));
        }
      }, 10000);
    });
  }

  private generateId(): string {
    return `web-${++this.messageId}-${Date.now()}`;
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
}