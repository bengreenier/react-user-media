import type {
  MediaWorkerController,
  MediaWorkerMessage,
  MediaWorkerMessageType,
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
 * Mock implementation of MediaWorkerController for testing and development
 * This allows testing WebCodecs functionality without actual web workers
 */
export class MockMediaWorkerController implements MediaWorkerController {
  private state: MediaWorkerState = {
    isInitialized: false,
    isProcessing: false,
    error: null,
    videoConfig: null,
    audioConfig: null,
    codecCapabilities: [],
  };

  private subscribers: Set<(message: MediaWorkerMessage) => void> = new Set();
  private videoConfig: VideoProcessingConfig | null = null;
  private audioConfig: AudioProcessingConfig | null = null;
  private messageId = 0;

  constructor() {
    // Simulate initialization delay
    setTimeout(() => {
      this.state.isInitialized = true;
      this.state.codecCapabilities = this.getMockCodecCapabilities();
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
        this.state.codecCapabilities = this.getMockCodecCapabilities();
        resolve();
      }, 10);
    });
  }

  async processVideoFrame(
    frame: VideoFrame, 
    options: VideoFrameProcessingOptions
  ): Promise<ProcessedVideoFrame> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    this.state.isProcessing = true;

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 50));

    this.state.isProcessing = false;

    // Mock processed frame data
    const processedFrame: ProcessedVideoFrame = {
      data: new ArrayBuffer(1920 * 1080 * 4), // Mock RGBA data
      width: options.options?.width || frame.displayWidth,
      height: options.options?.height || frame.displayHeight,
      format: options.options?.format || 'RGBA',
      timestamp: performance.now(),
    };

    this.notifySubscribers({
      id: this.generateId(),
      type: 'FRAME_PROCESSED',
      payload: { frame: processedFrame },
    });

    return processedFrame;
  }

  async processAudioData(
    data: AudioData, 
    options: AudioDataProcessingOptions
  ): Promise<ProcessedAudioData> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    this.state.isProcessing = true;

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 30));

    this.state.isProcessing = false;

    // Mock processed audio data
    const processedAudio: ProcessedAudioData = {
      data: new ArrayBuffer(data.numberOfFrames * data.numberOfChannels * 4), // Mock f32 data
      sampleRate: options.options?.sampleRate || data.sampleRate,
      channels: options.options?.channels || data.numberOfChannels,
      format: options.options?.format || 'f32',
      duration: data.numberOfFrames / data.sampleRate,
    };

    this.notifySubscribers({
      id: this.generateId(),
      type: 'SUCCESS',
      payload: { audio: processedAudio },
    });

    return processedAudio;
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

    // Simulate encoding delay
    await new Promise(resolve => setTimeout(resolve, 100));

    this.state.isProcessing = false;

    // Mock encoded chunks
    const chunks: EncodedVideoChunk[] = frames.map((frame, index) => {
      const data = new Uint8Array(1024); // Mock encoded data
      return new EncodedVideoChunk({
        type: index === 0 ? 'key' : 'delta',
        timestamp: performance.now() + index * 33, // ~30fps
        duration: 33333, // ~30fps
        data,
      });
    });

    this.notifySubscribers({
      id: this.generateId(),
      type: 'ENCODED_DATA',
      payload: { chunks, type: 'video' },
    });

    return chunks;
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

    // Simulate encoding delay
    await new Promise(resolve => setTimeout(resolve, 50));

    this.state.isProcessing = false;

    // Mock encoded chunks
    const chunks: EncodedAudioChunk[] = data.map((audioData, index) => {
      const data = new Uint8Array(512); // Mock encoded data
      return new EncodedAudioChunk({
        type: 'key',
        timestamp: performance.now() + index * 1000,
        duration: 1000000, // 1 second
        data,
      });
    });

    this.notifySubscribers({
      id: this.generateId(),
      type: 'ENCODED_DATA',
      payload: { chunks, type: 'audio' },
    });

    return chunks;
  }

  async decodeVideo(
    chunks: EncodedVideoChunk[], 
    config: VideoProcessingConfig
  ): Promise<VideoFrame[]> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    this.state.isProcessing = true;

    // Simulate decoding delay
    await new Promise(resolve => setTimeout(resolve, 80));

    this.state.isProcessing = false;

    // Mock decoded frames
    const frames: VideoFrame[] = chunks.map((chunk, index) => {
      // Create a mock VideoFrame - in real implementation this would come from decoder
      const canvas = new OffscreenCanvas(config.width || 1920, config.height || 1080);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = `hsl(${index * 30}, 50%, 50%)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      return new VideoFrame(canvas, { timestamp: chunk.timestamp });
    });

    this.notifySubscribers({
      id: this.generateId(),
      type: 'SUCCESS',
      payload: { frames, type: 'video' },
    });

    return frames;
  }

  async decodeAudio(
    chunks: EncodedAudioChunk[], 
    config: AudioProcessingConfig
  ): Promise<AudioData[]> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    this.state.isProcessing = true;

    // Simulate decoding delay
    await new Promise(resolve => setTimeout(resolve, 60));

    this.state.isProcessing = false;

    // Mock decoded audio data
    const audioData: AudioData[] = chunks.map((chunk) => {
      const sampleRate = config.sampleRate || 48000;
      const channels = config.channels || 2;
      const frames = 1024; // Mock frame count
      
      return new AudioData({
        format: config.format || 'f32',
        sampleRate,
        numberOfChannels: channels,
        numberOfFrames: frames,
        data: new Float32Array(frames * channels),
      });
    });

    this.notifySubscribers({
      id: this.generateId(),
      type: 'SUCCESS',
      payload: { audioData, type: 'audio' },
    });

    return audioData;
  }

  async configureCodec(
    type: 'video' | 'audio',
    config: VideoProcessingConfig | AudioProcessingConfig
  ): Promise<void> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    if (type === 'video') {
      this.state.videoConfig = config as VideoProcessingConfig;
    } else {
      this.state.audioConfig = config as AudioProcessingConfig;
    }

    this.notifySubscribers({
      id: this.generateId(),
      type: 'SUCCESS',
      payload: { message: `${type} codec configured` },
    });
  }

  async getCodecCapabilities(): Promise<CodecCapabilities[]> {
    if (!this.state.isInitialized) {
      throw new Error('Worker not initialized');
    }

    return this.state.codecCapabilities;
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
      isProcessing: false,
      error: null,
      videoConfig: null,
      audioConfig: null,
      codecCapabilities: [],
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

  private getMockCodecCapabilities(): CodecCapabilities[] {
    return [
      {
        supported: true,
        codec: 'avc1.42E01E', // H.264 Baseline
        hardwareAccelerated: true,
        maxWidth: 4096,
        maxHeight: 4096,
        maxFrameRate: 60,
        maxBitrate: 100000000, // 100 Mbps
      },
      {
        supported: true,
        codec: 'vp8',
        hardwareAccelerated: false,
        maxWidth: 4096,
        maxHeight: 4096,
        maxFrameRate: 60,
        maxBitrate: 50000000, // 50 Mbps
      },
      {
        supported: true,
        codec: 'vp9',
        hardwareAccelerated: true,
        maxWidth: 8192,
        maxHeight: 8192,
        maxFrameRate: 60,
        maxBitrate: 200000000, // 200 Mbps
      },
      {
        supported: true,
        codec: 'av01.0.08M.08', // AV1 Main
        hardwareAccelerated: true,
        maxWidth: 8192,
        maxHeight: 8192,
        maxFrameRate: 60,
        maxBitrate: 300000000, // 300 Mbps
      },
      {
        supported: true,
        codec: 'mp4a.40.2', // AAC-LC
        hardwareAccelerated: true,
        maxBitrate: 320000, // 320 kbps
      },
      {
        supported: true,
        codec: 'opus',
        hardwareAccelerated: false,
        maxBitrate: 256000, // 256 kbps
      },
    ];
  }
}