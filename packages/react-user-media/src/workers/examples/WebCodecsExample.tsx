import React, { useState, useRef } from 'react';
import { useMediaWorker } from '../use-media-worker';

/**
 * Example component demonstrating WebCodecs worker usage
 */
export function WebCodecsExample() {
  const [useMockWorker, setUseMockWorker] = useState(true);
  const [status, setStatus] = useState('Ready');
  const [processedFrame, setProcessedFrame] = useState<ArrayBuffer | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const mediaWorker = useMediaWorker({
    useMockWorker,
    autoInitialize: true,
  });

  const handleProcessVideoFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      setStatus('Processing video frame...');
      
      // Create a VideoFrame from the video element
      const videoFrame = new VideoFrame(videoRef.current, {
        timestamp: performance.now(),
      });

      // Process the frame
      const result = await mediaWorker.processVideoFrame(videoFrame, {
        operation: 'resize',
        options: { width: 640, height: 480, format: 'RGBA' },
      });

      setProcessedFrame(result.data);
      setStatus(`Processed frame: ${result.width}x${result.height} ${result.format}`);
      
      // Draw the processed frame to canvas
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
      const imageData = new ImageData(
        new Uint8ClampedArray(result.data),
        result.width,
        result.height
      );
      canvas.width = result.width;
      canvas.height = result.height;
      ctx.putImageData(imageData, 0, 0);

      videoFrame.close();
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleGetCodecCapabilities = async () => {
    try {
      setStatus('Getting codec capabilities...');
      const capabilities = await mediaWorker.getCodecCapabilities();
      setStatus(`Found ${capabilities.length} codec capabilities`);
      console.log('Codec capabilities:', capabilities);
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>WebCodecs Media Worker Example</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>
          <input
            type="checkbox"
            checked={useMockWorker}
            onChange={(e) => setUseMockWorker(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Use Mock Worker (for testing)
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <p><strong>Status:</strong> {status}</p>
        <p><strong>Initialized:</strong> {mediaWorker.isInitialized ? 'Yes' : 'No'}</p>
        <p><strong>Processing:</strong> {mediaWorker.isProcessing ? 'Yes' : 'No'}</p>
        <p><strong>Error:</strong> {mediaWorker.error || 'None'}</p>
        <p><strong>Codec Capabilities:</strong> {mediaWorker.codecCapabilities.length}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <video
          ref={videoRef}
          width="320"
          height="240"
          controls
          style={{ marginRight: '20px' }}
        >
          <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        <canvas
          ref={canvasRef}
          width="640"
          height="480"
          style={{ border: '1px solid #ccc' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleProcessVideoFrame}
          disabled={!mediaWorker.isInitialized || mediaWorker.isProcessing}
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
          Process Video Frame
        </button>
        
        <button
          onClick={handleGetCodecCapabilities}
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
          Get Codec Capabilities
        </button>
      </div>

      {processedFrame && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Processed Frame Data</h3>
          <p>Size: {processedFrame.byteLength} bytes</p>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3>Codec Capabilities</h3>
        <ul>
          {mediaWorker.codecCapabilities.map((cap, index) => (
            <li key={index}>
              <strong>{cap.codec}</strong> - 
              {cap.supported ? 'Supported' : 'Not Supported'} - 
              {cap.hardwareAccelerated ? 'Hardware Accelerated' : 'Software Only'}
              {cap.maxWidth && ` (Max: ${cap.maxWidth}x${cap.maxHeight})`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}