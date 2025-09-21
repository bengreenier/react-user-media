import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockMediaWorkerController } from '../mock-worker';

// Mock performance.now
const mockPerformanceNow = vi.fn(() => 1000);
Object.defineProperty(globalThis, 'performance', {
  value: {
    now: mockPerformanceNow,
  },
  writable: true,
});

describe('MockMediaWorkerController', () => {
  let controller: MockMediaWorkerController;

  beforeEach(() => {
    controller = new MockMediaWorkerController();
    vi.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const state = controller.getState();
    
    expect(state.isInitialized).toBe(false);
    expect(state.isProcessing).toBe(false);
    expect(state.error).toBe(null);
    expect(state.videoConfig).toBe(null);
    expect(state.audioConfig).toBe(null);
    expect(state.codecCapabilities).toEqual([]);
  });

  it('should initialize asynchronously', async () => {
    const initPromise = controller.initialize();
    
    // Should not be initialized immediately
    expect(controller.getState().isInitialized).toBe(false);
    
    await initPromise;
    
    // Should be initialized after promise resolves
    expect(controller.getState().isInitialized).toBe(true);
  });

  it('should process video frame', async () => {
    await controller.initialize();
    
    // Create a mock VideoFrame
    const canvas = new OffscreenCanvas(1920, 1080);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 1920, 1080);
    const frame = new VideoFrame(canvas, { timestamp: performance.now() });
    
    const result = await controller.processVideoFrame(frame, {
      operation: 'resize',
      options: { width: 640, height: 480, format: 'RGBA' },
    });
    
    expect(result.data).toBeInstanceOf(ArrayBuffer);
    expect(result.width).toBe(640);
    expect(result.height).toBe(480);
    expect(result.format).toBe('RGBA');
    expect(result.timestamp).toBeGreaterThan(0);
    
    frame.close();
  });

  it('should process audio data', async () => {
    await controller.initialize();
    
    // Create mock AudioData
    const audioData = new AudioData({
      format: 'f32',
      sampleRate: 48000,
      numberOfChannels: 2,
      numberOfFrames: 1024,
      timestamp: performance.now(),
      data: new Float32Array(2048),
    });
    
    const result = await controller.processAudioData(audioData, {
      operation: 'resample',
      options: { sampleRate: 44100, channels: 1 },
    });
    
    expect(result.data).toBeInstanceOf(ArrayBuffer);
    expect(result.sampleRate).toBe(44100);
    expect(result.channels).toBe(1);
    expect(result.format).toBe('f32');
    expect(result.duration).toBeGreaterThan(0);
  });

  it('should encode video frames', async () => {
    await controller.initialize();
    
    // Create mock VideoFrames
    const canvas = new OffscreenCanvas(1920, 1080);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'blue';
    ctx.fillRect(0, 0, 1920, 1080);
    const frame = new VideoFrame(canvas, { timestamp: performance.now() });
    
    const chunks = await controller.encodeVideo([frame], {
      codec: 'vp8',
      width: 1920,
      height: 1080,
      bitrate: 1000000,
      frameRate: 30,
    });
    
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBeInstanceOf(EncodedVideoChunk);
    expect(chunks[0].type).toBe('key');
    
    frame.close();
  });

  it('should get codec capabilities', async () => {
    await controller.initialize();
    
    const capabilities = await controller.getCodecCapabilities();
    
    expect(capabilities).toHaveLength(6);
    expect(capabilities[0]).toEqual({
      supported: true,
      codec: 'avc1.42E01E',
      hardwareAccelerated: true,
      maxWidth: 4096,
      maxHeight: 4096,
      maxFrameRate: 60,
      maxBitrate: 100000000,
    });
  });

  it('should handle subscriptions', async () => {
    const callback = vi.fn();
    const unsubscribe = controller.subscribe(callback);
    
    expect(typeof unsubscribe).toBe('function');
    
    // Trigger a message by initializing
    await controller.initialize();
    
    // Should have received messages
    expect(callback).toHaveBeenCalled();
    
    // Unsubscribe should work
    unsubscribe();
  });

  it('should terminate and reset state', () => {
    controller.terminate();
    
    const state = controller.getState();
    expect(state.isInitialized).toBe(false);
    expect(state.isProcessing).toBe(false);
    expect(state.error).toBe(null);
    expect(state.videoConfig).toBe(null);
    expect(state.audioConfig).toBe(null);
    expect(state.codecCapabilities).toEqual([]);
  });

  it('should throw error when not initialized', async () => {
    // Create a proper canvas with content
    const canvas = new OffscreenCanvas(100, 100);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 100, 100);
    
    const frame = new VideoFrame(canvas, { timestamp: performance.now() });
    const audioData = new AudioData({
      format: 'f32',
      sampleRate: 48000,
      numberOfChannels: 2,
      numberOfFrames: 1024,
      timestamp: performance.now(),
      data: new Float32Array(2048),
    });
    
    await expect(controller.processVideoFrame(frame, { operation: 'resize' })).rejects.toThrow('Worker not initialized');
    await expect(controller.processAudioData(audioData, { operation: 'resample' })).rejects.toThrow('Worker not initialized');
    await expect(controller.getCodecCapabilities()).rejects.toThrow('Worker not initialized');
    
    frame.close();
  });
});