import { describe, it, expect } from 'vitest';
import type {
  MediaWorkerMessage,
  MediaWorkerMessageType,
  MediaWorkerRecordingConfig,
  MediaWorkerProcessingOptions,
  MediaWorkerDeviceInfo,
  MediaWorkerState,
  MediaWorkerController,
} from '../types';

describe('Worker Types', () => {
  it('should define correct message types', () => {
    const messageTypes: MediaWorkerMessageType[] = [
      'INIT',
      'START_RECORDING',
      'STOP_RECORDING',
      'PROCESS_MEDIA',
      'GET_DEVICES',
      'ERROR',
      'SUCCESS',
      'DATA_AVAILABLE',
    ];

    expect(messageTypes).toHaveLength(8);
    expect(messageTypes).toContain('INIT');
    expect(messageTypes).toContain('START_RECORDING');
    expect(messageTypes).toContain('STOP_RECORDING');
  });

  it('should create valid message structure', () => {
    const message: MediaWorkerMessage = {
      id: 'test-1',
      type: 'SUCCESS',
      payload: { message: 'Test success' },
    };

    expect(message.id).toBe('test-1');
    expect(message.type).toBe('SUCCESS');
    expect(message.payload).toEqual({ message: 'Test success' });
  });

  it('should define recording configuration', () => {
    const config: MediaWorkerRecordingConfig = {
      mimeType: 'video/webm',
      timeslice: 1000,
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    };

    expect(config.mimeType).toBe('video/webm');
    expect(config.timeslice).toBe(1000);
    expect(config.videoBitsPerSecond).toBe(2500000);
  });

  it('should define processing options', () => {
    const options: MediaWorkerProcessingOptions = {
      operation: 'compress',
      options: { quality: 0.8 },
    };

    expect(options.operation).toBe('compress');
    expect(options.options).toEqual({ quality: 0.8 });
  });

  it('should define device info structure', () => {
    const device: MediaWorkerDeviceInfo = {
      deviceId: 'test-camera',
      kind: 'videoinput',
      label: 'Test Camera',
      groupId: 'test-group',
    };

    expect(device.deviceId).toBe('test-camera');
    expect(device.kind).toBe('videoinput');
    expect(device.label).toBe('Test Camera');
  });

  it('should define worker state structure', () => {
    const state: MediaWorkerState = {
      isInitialized: true,
      isRecording: false,
      isProcessing: false,
      error: null,
      recordingStartTime: null,
      recordingEndTime: null,
      segments: [],
      mimeType: null,
    };

    expect(state.isInitialized).toBe(true);
    expect(state.isRecording).toBe(false);
    expect(state.isProcessing).toBe(false);
    expect(state.error).toBe(null);
  });
});