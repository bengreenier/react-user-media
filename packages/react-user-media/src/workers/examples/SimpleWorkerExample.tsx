import React, { useState } from 'react';
import { useMediaWorker, useMediaWorkerRecorder } from '../use-media-worker';

/**
 * Simple example demonstrating basic worker usage
 */
export function SimpleWorkerExample() {
  const [useMock, setUseMock] = useState(true);
  const [status, setStatus] = useState('Ready');

  // Basic media worker
  const mediaWorker = useMediaWorker({
    useMockWorker: useMock,
    autoInitialize: true,
  });

  // Specialized recorder
  const recorder = useMediaWorkerRecorder({
    useMockWorker: useMock,
    autoInitialize: true,
  });

  const handleStartRecording = async () => {
    try {
      setStatus('Starting recording...');
      await recorder.startRecording({
        mimeType: 'video/webm',
        timeslice: 1000,
      });
      setStatus('Recording...');
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleStopRecording = async () => {
    try {
      setStatus('Stopping recording...');
      const segments = await recorder.stopRecording();
      setStatus(`Recording stopped. Got ${segments.length} segments.`);
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleGetDevices = async () => {
    try {
      setStatus('Getting devices...');
      const devices = await mediaWorker.getDevices();
      setStatus(`Found ${devices.length} devices`);
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Simple Media Worker Example</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>
          <input
            type="checkbox"
            checked={useMock}
            onChange={(e) => setUseMock(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Use Mock Worker (for testing)
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <p><strong>Status:</strong> {status}</p>
        <p><strong>Initialized:</strong> {mediaWorker.isInitialized ? 'Yes' : 'No'}</p>
        <p><strong>Recording:</strong> {recorder.isRecording ? 'Yes' : 'No'}</p>
        <p><strong>Error:</strong> {mediaWorker.error || 'None'}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
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
        
        <button
          onClick={handleGetDevices}
          disabled={!mediaWorker.isInitialized}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Get Devices
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Worker State</h3>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '4px',
          fontSize: '12px',
          overflow: 'auto',
        }}>
          {JSON.stringify(mediaWorker.workerState, null, 2)}
        </pre>
      </div>
    </div>
  );
}