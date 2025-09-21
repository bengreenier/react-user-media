import type {
  MediaWorkerController,
  MediaWorkerMessage,
  VideoProcessingConfig,
  AudioProcessingConfig,
  VideoFrameProcessingOptions,
  AudioDataProcessingOptions,
  CodecCapabilities,
  ProcessedVideoFrame,
  ProcessedAudioData,
  MediaWorkerState,
} from './types';

/**
 * Production implementation of MediaWorkerController using actual Web Workers
 */
export class WebMediaWorkerController implements MediaWorkerController {
  private worker: Worker | null = null;
  private state: MediaWorkerState = {
    isInitialized: false,
    isProcessing: false,
    error: null,
    videoConfig: null,
    audioConfig: null,
    codecCapabilities: [],
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
      // WebCodecs-based media worker implementation
      let videoEncoder = null;
      let audioEncoder = null;
      let videoDecoder = null;
      let audioDecoder = null;
      let videoConfig = null;
      let audioConfig = null;
      let codecCapabilities = [];

      // Initialize codec capabilities
      async function initCodecCapabilities() {
        try {
          // Check video codec support
          const videoCodecs = [
            'avc1.42E01E', // H.264 Baseline
            'vp8',
            'vp9',
            'av01.0.08M.08', // AV1 Main
          ];

          for (const codec of videoCodecs) {
            try {
              const support = await VideoEncoder.isConfigSupported({
                codec,
                width: 1920,
                height: 1080,
                bitrate: 1000000,
                framerate: 30,
              });
              
              codecCapabilities.push({
                supported: support.supported,
                codec,
                hardwareAccelerated: support.config?.hardwareAcceleration === 'prefer-hardware',
                maxWidth: 4096,
                maxHeight: 4096,
                maxFrameRate: 60,
                maxBitrate: 100000000,
              });
            } catch (e) {
              // Codec not supported
            }
          }

          // Check audio codec support
          const audioCodecs = [
            'mp4a.40.2', // AAC-LC
            'opus',
          ];

          for (const codec of audioCodecs) {
            try {
              const support = await AudioEncoder.isConfigSupported({
                codec,
                sampleRate: 48000,
                numberOfChannels: 2,
                bitrate: 128000,
              });
              
              codecCapabilities.push({
                supported: support.supported,
                codec,
                hardwareAccelerated: support.config?.hardwareAcceleration === 'prefer-hardware',
                maxBitrate: 320000,
              });
            } catch (e) {
              // Codec not supported
            }
          }
        } catch (error) {
          console.error('Error initializing codec capabilities:', error);
        }
      }

      self.onmessage = async function(e) {
        const { id, type, payload } = e.data;
        
        try {
          switch (type) {
            case 'INIT':
              await initCodecCapabilities();
              self.postMessage({ 
                id, 
                type: 'SUCCESS', 
                payload: { 
                  message: 'Worker initialized',
                  capabilities: codecCapabilities 
                } 
              });
              break;
              
            case 'PROCESS_VIDEO_FRAME':
              // Process video frame using WebCodecs
              const frame = payload.frame;
              const options = payload.options;
              
              // Create a canvas to process the frame
              const canvas = new OffscreenCanvas(frame.displayWidth, frame.displayHeight);
              const ctx = canvas.getContext('2d');
              
              // Draw frame to canvas
              ctx.drawImage(frame, 0, 0);
              
              // Apply processing based on options
              if (options.operation === 'resize' && options.options) {
                const { width, height } = options.options;
                const resizedCanvas = new OffscreenCanvas(width, height);
                const resizedCtx = resizedCanvas.getContext('2d');
                resizedCtx.drawImage(canvas, 0, 0, width, height);
                
                const imageData = resizedCtx.getImageData(0, 0, width, height);
                const processedFrame = {
                  data: imageData.data.buffer,
                  width,
                  height,
                  format: 'RGBA',
                  timestamp: performance.now(),
                };
                
                self.postMessage({ 
                  id, 
                  type: 'FRAME_PROCESSED', 
                  payload: { frame: processedFrame } 
                });
              } else {
                // Default processing
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const processedFrame = {
                  data: imageData.data.buffer,
                  width: canvas.width,
                  height: canvas.height,
                  format: 'RGBA',
                  timestamp: performance.now(),
                };
                
                self.postMessage({ 
                  id, 
                  type: 'FRAME_PROCESSED', 
                  payload: { frame: processedFrame } 
                });
              }
              break;
              
            case 'PROCESS_AUDIO_DATA':
              // Process audio data using WebCodecs
              const audioData = payload.data;
              const audioOptions = payload.options;
              
              // Simple audio processing simulation
              const processedAudio = {
                data: audioData.data.buffer,
                sampleRate: audioOptions.options?.sampleRate || audioData.sampleRate,
                channels: audioOptions.options?.channels || audioData.numberOfChannels,
                format: audioOptions.options?.format || 'f32',
                duration: audioData.numberOfFrames / audioData.sampleRate,
              };
              
              self.postMessage({ 
                id, 
                type: 'SUCCESS', 
                payload: { audio: processedAudio } 
              });
              break;
              
            case 'ENCODE_VIDEO':
              // Encode video frames
              const frames = payload.frames;
              const vConfig = payload.config;
              
              if (!videoEncoder) {
                videoEncoder = new VideoEncoder({
                  output: (chunk) => {
                    self.postMessage({ 
                      id, 
                      type: 'ENCODED_DATA', 
                      payload: { chunks: [chunk], type: 'video' } 
                    });
                  },
                  error: (error) => {
                    self.postMessage({ 
                      id, 
                      type: 'ERROR', 
                      error: error.message 
                    });
                  }
                });
              }
              
              videoEncoder.configure({
                codec: vConfig.codec || 'vp8',
                width: vConfig.width || 1920,
                height: vConfig.height || 1080,
                bitrate: vConfig.bitrate || 1000000,
                framerate: vConfig.frameRate || 30,
              });
              
              for (const frame of frames) {
                videoEncoder.encode(frame);
              }
              
              self.postMessage({ 
                id, 
                type: 'SUCCESS', 
                payload: { message: 'Video encoding started' } 
              });
              break;
              
            case 'ENCODE_AUDIO':
              // Encode audio data
              const audioFrames = payload.data;
              const aConfig = payload.config;
              
              if (!audioEncoder) {
                audioEncoder = new AudioEncoder({
                  output: (chunk) => {
                    self.postMessage({ 
                      id, 
                      type: 'ENCODED_DATA', 
                      payload: { chunks: [chunk], type: 'audio' } 
                    });
                  },
                  error: (error) => {
                    self.postMessage({ 
                      id, 
                      type: 'ERROR', 
                      error: error.message 
                    });
                  }
                });
              }
              
              audioEncoder.configure({
                codec: aConfig.codec || 'mp4a.40.2',
                sampleRate: aConfig.sampleRate || 48000,
                numberOfChannels: aConfig.channels || 2,
                bitrate: aConfig.bitrate || 128000,
              });
              
              for (const audioData of audioFrames) {
                audioEncoder.encode(audioData);
              }
              
              self.postMessage({ 
                id, 
                type: 'SUCCESS', 
                payload: { message: 'Audio encoding started' } 
              });
              break;
              
            case 'CONFIGURE_CODEC':
              const codecType = payload.type;
              const config = payload.config;
              
              if (codecType === 'video') {
                videoConfig = config;
              } else {
                audioConfig = config;
              }
              
              self.postMessage({ 
                id, 
                type: 'SUCCESS', 
                payload: { message: \`\${codecType} codec configured\` } 
              });
              break;
              
            case 'GET_CODEC_CAPABILITIES':
              self.postMessage({ 
                id, 
                type: 'SUCCESS', 
                payload: { capabilities: codecCapabilities } 
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
          this.state.codecCapabilities = message.payload.capabilities || [];
        } else if (message.payload?.message?.includes('codec configured')) {
          // Codec configuration handled in individual methods
        }
        break;
      case 'ERROR':
        this.state.error = message.error || 'Unknown error';
        break;
      case 'FRAME_PROCESSED':
        // Frame processing completed
        break;
      case 'ENCODED_DATA':
        // Encoding completed
        break;
    }
  }

  async initialize(): Promise<void> {
    return this.sendMessage('INIT');
  }

  async processVideoFrame(
    frame: VideoFrame, 
    options: VideoFrameProcessingOptions
  ): Promise<ProcessedVideoFrame> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    this.state.isProcessing = true;
    
    try {
      const result = await this.sendMessage('PROCESS_VIDEO_FRAME', { frame, options });
      return result.frame;
    } finally {
      this.state.isProcessing = false;
    }
  }

  async processAudioData(
    data: AudioData, 
    options: AudioDataProcessingOptions
  ): Promise<ProcessedAudioData> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    this.state.isProcessing = true;
    
    try {
      const result = await this.sendMessage('PROCESS_AUDIO_DATA', { data, options });
      return result.audio;
    } finally {
      this.state.isProcessing = false;
    }
  }

  async encodeVideo(
    frames: VideoFrame[], 
    config: VideoProcessingConfig
  ): Promise<EncodedVideoChunk[]> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    this.state.isProcessing = true;
    this.state.videoConfig = config;
    
    try {
      const result = await this.sendMessage('ENCODE_VIDEO', { frames, config });
      return result.chunks || [];
    } finally {
      this.state.isProcessing = false;
    }
  }

  async encodeAudio(
    data: AudioData[], 
    config: AudioProcessingConfig
  ): Promise<EncodedAudioChunk[]> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    this.state.isProcessing = true;
    this.state.audioConfig = config;
    
    try {
      const result = await this.sendMessage('ENCODE_AUDIO', { data, config });
      return result.chunks || [];
    } finally {
      this.state.isProcessing = false;
    }
  }

  async decodeVideo(
    chunks: EncodedVideoChunk[], 
    config: VideoProcessingConfig
  ): Promise<VideoFrame[]> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    this.state.isProcessing = true;
    
    try {
      const result = await this.sendMessage('DECODE_VIDEO', { chunks, config });
      return result.frames || [];
    } finally {
      this.state.isProcessing = false;
    }
  }

  async decodeAudio(
    chunks: EncodedAudioChunk[], 
    config: AudioProcessingConfig
  ): Promise<AudioData[]> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    this.state.isProcessing = true;
    
    try {
      const result = await this.sendMessage('DECODE_AUDIO', { chunks, config });
      return result.audioData || [];
    } finally {
      this.state.isProcessing = false;
    }
  }

  async configureCodec(
    type: 'video' | 'audio',
    config: VideoProcessingConfig | AudioProcessingConfig
  ): Promise<void> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    return this.sendMessage('CONFIGURE_CODEC', { type, config });
  }

  async getCodecCapabilities(): Promise<CodecCapabilities[]> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    const result = await this.sendMessage('GET_CODEC_CAPABILITIES');
    return result.capabilities || [];
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
      isProcessing: false,
      error: null,
      videoConfig: null,
      audioConfig: null,
      codecCapabilities: [],
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