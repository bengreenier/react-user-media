import React, { useState, useEffect } from 'react';
import { useMediaWorker, useMediaWorkerRecorder } from '../use-media-worker';

/**
 * Example component demonstrating media worker usage
 */
export function MediaWorkerExample() {
  const [useMockWorker, setUseMockWorker] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [segments, setSegments] = useState<Blob[]>([]);
  const [devices, setDevices] = useState<any[]>([]);

  // Basic media worker
  const mediaWorker = useMediaWorker({
    useMockWorker,
    autoInitialize: true,
  });

  // Specialized recorder
  const recorder = useMediaWorkerRecorder({
    useMockWorker,
    autoInitialize: true,
    defaultRecordingConfig: {
      mimeType: 'video/webm',
      timeslice: 1000, // 1 second chunks
    },
  });

  // Load devices on mount
  useEffect(() => {
    if (mediaWorker.isInitialized) {
      mediaWorker.getDevices().then(setDevices);
    }
  }, [mediaWorker.isInitialized]);

  // Subscribe to worker messages
  useEffect(() => {
    const unsubscribe = mediaWorker.subscribe((message) => {
      console.log('Worker message:', message);
    });

    return unsubscribe;
  }, [mediaWorker]);

  const handleStartRecording = async () => {
    try {
      await recorder.startRecording({
        mimeType: 'video/webm',
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000,
      });
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      const recordedSegments = await recorder.stopRecording();
      setSegments(recordedSegments);
      setIsRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const handleProcessMedia = async () => {
    if (segments.length === 0) return;

    try {
      const processedBlob = await mediaWorker.processMedia(segments[0], {
        operation: 'compress',
        options: { quality: 0.8 },
      });
      
      console.log('Processed media:', processedBlob);
      // You could download or display the processed media here
    } catch (error) {
      console.error('Failed to process media:', error);
    }
  };

  const handleClearSegments = () => {
    setSegments([]);
    recorder.clearSegments();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Media Worker Example</h2>
      
      {/* Worker Configuration */}
      <div style={{ marginBottom: '20px' }}>
        <label>
          <input
            type="checkbox"
            checked={useMockWorker}
            onChange={(e) => setUseMockWorker(e.target.checked)}
          />
          Use Mock Worker (for testing)
        </label>
      </div>

      {/* Worker Status */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Worker Status</h3>
        <p>Initialized: {mediaWorker.isInitialized ? 'Yes' : 'No'}</p>
        <p>Recording: {recorder.isRecording ? 'Yes' : 'No'}</p>
        <p>Processing: {mediaWorker.isProcessing ? 'Yes' : 'No'}</p>
        <p>Error: {mediaWorker.error || 'None'}</p>
        {recorder.getDuration() && (
          <p>Duration: {Math.round(recorder.getDuration()! / 1000)}s</p>
        )}
      </div>

      {/* Available Devices */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Available Devices</h3>
        {mediaWorker.isLoadingDevices ? (
          <p>Loading devices...</p>
        ) : (
          <ul>
            {devices.map((device, index) => (
              <li key={index}>
                {device.label} ({device.kind})
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recording Controls */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Recording Controls</h3>
        <button
          onClick={handleStartRecording}
          disabled={!recorder.isInitialized || recorder.isRecording}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Start Recording
        </button>
        <button
          onClick={handleStopRecording}
          disabled={!recorder.isRecording}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Stop Recording
        </button>
      </div>

      {/* Recorded Segments */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Recorded Segments</h3>
        <p>Count: {segments.length}</p>
        {segments.length > 0 && (
          <div>
            <button
              onClick={handleProcessMedia}
              style={{
                padding: '10px 20px',
                marginRight: '10px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Process Media
            </button>
            <button
              onClick={handleClearSegments}
              style={{
                padding: '10px 20px',
                backgroundColor: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Clear Segments
            </button>
          </div>
        )}
      </div>

      {/* Worker State Debug */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Worker State (Debug)</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(mediaWorker.workerState, null, 2)}
        </pre>
      </div>

      {/* Cleanup */}
      <div>
        <button
          onClick={() => {
            mediaWorker.terminate();
            setSegments([]);
            setDevices([]);
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#9E9E9E',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Terminate Worker
        </button>
      </div>
    </div>
  );
}