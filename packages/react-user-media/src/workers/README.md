# Media Workers

This module provides worker-based abstractions for media operations, allowing for testing without the full web worker stack while maintaining production compatibility.

## Overview

The media workers module consists of:

- **Types**: Core interfaces and type definitions
- **Mock Worker**: Test-friendly implementation that doesn't require actual web workers
- **Web Worker**: Production implementation using actual web workers
- **Factory**: Management and creation of worker instances
- **Hooks**: React hooks for easy integration

## Key Features

- **Testable**: Mock implementation for unit testing without web workers
- **Production Ready**: Real web worker implementation for production use
- **Type Safe**: Full TypeScript support with comprehensive type definitions
- **React Integration**: Custom hooks for seamless React integration
- **Flexible**: Configurable worker behavior and lifecycle management

## Basic Usage

### Using the Media Worker Hook

```tsx
import { useMediaWorker } from '@react-user-media/workers';

function MyComponent() {
  const mediaWorker = useMediaWorker({
    useMockWorker: process.env.NODE_ENV === 'test', // Use mock in tests
    autoInitialize: true,
  });

  const handleStartRecording = async () => {
    try {
      await mediaWorker.startRecording({
        mimeType: 'video/webm',
        videoBitsPerSecond: 2500000,
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  return (
    <div>
      <p>Initialized: {mediaWorker.isInitialized ? 'Yes' : 'No'}</p>
      <p>Recording: {mediaWorker.isRecording ? 'Yes' : 'No'}</p>
      <button onClick={handleStartRecording} disabled={!mediaWorker.isInitialized}>
        Start Recording
      </button>
    </div>
  );
}
```

### Using the Media Worker Recorder

```tsx
import { useMediaWorkerRecorder } from '@react-user-media/workers';

function RecordingComponent() {
  const recorder = useMediaWorkerRecorder({
    useMockWorker: process.env.NODE_ENV === 'test',
    defaultRecordingConfig: {
      mimeType: 'video/webm',
      timeslice: 1000, // 1 second chunks
    },
  });

  const handleStopRecording = async () => {
    const segments = await recorder.stopRecording();
    console.log('Recorded segments:', segments);
  };

  return (
    <div>
      <p>Duration: {recorder.getDuration() ? Math.round(recorder.getDuration()! / 1000) : 0}s</p>
      <p>Finalized: {recorder.isFinalized ? 'Yes' : 'No'}</p>
      <button onClick={handleStopRecording} disabled={!recorder.isRecording}>
        Stop Recording
      </button>
    </div>
  );
}
```

## Configuration

### Worker Factory Configuration

```tsx
import { getWorkerFactory } from '@react-user-media/workers';

const factory = getWorkerFactory({
  useMockWorker: process.env.NODE_ENV === 'test',
  workerScript: '/path/to/custom-worker.js',
  isWorkerSupported: () => typeof Worker !== 'undefined',
});
```

### Hook Configuration

```tsx
const mediaWorker = useMediaWorker({
  workerId: 'my-worker', // Unique identifier
  useMockWorker: false, // Use real web worker
  workerScript: '/custom-worker.js', // Custom worker script
  autoInitialize: true, // Auto-initialize on mount
});
```

## Testing

The mock worker implementation allows you to test worker functionality without actual web workers:

```tsx
import { renderHook, act } from '@testing-library/react';
import { useMediaWorker } from '@react-user-media/workers';

test('should start recording', async () => {
  const { result } = renderHook(() => useMediaWorker({ useMockWorker: true }));
  
  await act(async () => {
    await result.current.initialize();
    await result.current.startRecording();
  });
  
  expect(result.current.isRecording).toBe(true);
});
```

## Worker Messages

The worker system uses a message-based communication pattern:

```tsx
const unsubscribe = mediaWorker.subscribe((message) => {
  switch (message.type) {
    case 'SUCCESS':
      console.log('Operation succeeded:', message.payload);
      break;
    case 'ERROR':
      console.error('Operation failed:', message.error);
      break;
    case 'DATA_AVAILABLE':
      console.log('New data available:', message.payload);
      break;
  }
});
```

## Media Processing

The worker can process media data for various operations:

```tsx
const processedBlob = await mediaWorker.processMedia(originalBlob, {
  operation: 'compress',
  options: { quality: 0.8 },
});
```

Supported operations:
- `compress`: Compress media data
- `convert`: Convert between formats
- `extract_audio`: Extract audio track
- `extract_video`: Extract video track
- `resize`: Resize video dimensions

## Device Management

Get available media devices through the worker:

```tsx
const devices = await mediaWorker.getDevices();
console.log('Available devices:', devices);
```

## Lifecycle Management

Workers are automatically managed, but you can control them manually:

```tsx
// Terminate a specific worker
mediaWorker.terminate();

// Or use the factory to manage multiple workers
const factory = getWorkerFactory();
factory.removeWorker('worker-id');
factory.removeAllWorkers();
```

## Error Handling

The worker system provides comprehensive error handling:

```tsx
const mediaWorker = useMediaWorker();

if (mediaWorker.isError) {
  console.error('Worker error:', mediaWorker.error);
}

// Subscribe to error messages
mediaWorker.subscribe((message) => {
  if (message.type === 'ERROR') {
    // Handle error
  }
});
```

## Performance Considerations

- **Mock Workers**: Use for testing and development - no performance overhead
- **Web Workers**: Use for production - offloads processing to background thread
- **Memory Management**: Workers are automatically cleaned up when components unmount
- **Resource Limits**: Consider worker limits in your target environment

## Browser Support

- **Web Workers**: Modern browsers with Web Worker support
- **Mock Workers**: All environments (fallback for unsupported browsers)
- **Media APIs**: Requires secure context (HTTPS) for media device access