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
    expect(state.isRecording).toBe(false);
    expect(state.isProcessing).toBe(false);
    expect(state.error).toBe(null);
    expect(state.recordingStartTime).toBe(null);
    expect(state.recordingEndTime).toBe(null);
    expect(state.segments).toEqual([]);
    expect(state.mimeType).toBe(null);
  });

  it('should initialize asynchronously', async () => {
    const initPromise = controller.initialize();
    
    // Should not be initialized immediately
    expect(controller.getState().isInitialized).toBe(false);
    
    await initPromise;
    
    // Should be initialized after promise resolves
    expect(controller.getState().isInitialized).toBe(true);
  });

  it('should start recording', async () => {
    await controller.initialize();
    
    const config = { mimeType: 'video/webm', timeslice: 1000 };
    await controller.startRecording(config);
    
    const state = controller.getState();
    expect(state.isRecording).toBe(true);
    expect(state.mimeType).toBe('video/webm');
    expect(state.recordingStartTime).toBe(1000); // Mock performance.now value
  });

  it('should stop recording and return segments', async () => {
    await controller.initialize();
    await controller.startRecording();
    
    const segments = await controller.stopRecording();
    
    expect(segments).toHaveLength(1);
    expect(segments[0]).toBeInstanceOf(Blob);
    expect(segments[0].type).toBe('video/webm');
    
    const state = controller.getState();
    expect(state.isRecording).toBe(false);
    expect(state.recordingEndTime).toBe(1000);
  });

  it('should process media', async () => {
    await controller.initialize();
    
    const inputBlob = new Blob(['test input'], { type: 'video/webm' });
    const processedBlob = await controller.processMedia(inputBlob, {
      operation: 'compress',
      options: { quality: 0.8 },
    });
    
    expect(processedBlob).toBeInstanceOf(Blob);
    expect(processedBlob.type).toBe('video/webm');
  });

  it('should get devices', async () => {
    await controller.initialize();
    
    const devices = await controller.getDevices();
    
    expect(devices).toHaveLength(2);
    expect(devices[0]).toEqual({
      deviceId: 'mock-camera-1',
      kind: 'videoinput',
      label: 'Mock Camera 1',
      groupId: 'mock-group-1',
    });
    expect(devices[1]).toEqual({
      deviceId: 'mock-microphone-1',
      kind: 'audioinput',
      label: 'Mock Microphone 1',
      groupId: 'mock-group-1',
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
    expect(state.isRecording).toBe(false);
    expect(state.isProcessing).toBe(false);
    expect(state.error).toBe(null);
    expect(state.recordingStartTime).toBe(null);
    expect(state.recordingEndTime).toBe(null);
    expect(state.segments).toEqual([]);
    expect(state.mimeType).toBe(null);
  });

  it('should throw error when not initialized', async () => {
    await expect(controller.startRecording()).rejects.toThrow('Worker not initialized');
    await expect(controller.processMedia(new Blob(), { operation: 'compress' })).rejects.toThrow('Worker not initialized');
    await expect(controller.getDevices()).rejects.toThrow('Worker not initialized');
  });

  it('should throw error when already recording', async () => {
    await controller.initialize();
    await controller.startRecording();
    
    await expect(controller.startRecording()).rejects.toThrow('Already recording');
  });

  it('should throw error when not recording', async () => {
    await controller.initialize();
    
    await expect(controller.stopRecording()).rejects.toThrow('Not currently recording');
  });
});